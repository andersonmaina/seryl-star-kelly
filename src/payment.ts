(function(){
  const form = document.getElementById('paymentForm') as HTMLFormElement | null;
  const msisdn = document.getElementById('clientMSISDN') as HTMLInputElement | null;
  const regInput = document.getElementById('clientName') as HTMLInputElement | null;
  const badge = document.getElementById('studentNameBadge') as HTMLDivElement | null;
  const messages = document.getElementById('messages') as HTMLDivElement | null;
  const summaryText = document.getElementById('summaryText') as HTMLDivElement | null;
  const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement | null;
  const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement | null;
  const emailHidden = document.getElementById('clientEmail') as HTMLInputElement | null;
  const idHidden = document.getElementById('clientIDNumber') as HTMLInputElement | null;
  const amountExpected = document.getElementById('amountExpected') as HTMLInputElement | null;
  const billDescType = document.getElementById('BillDescType') as HTMLSelectElement | null;

  if (!form || !msisdn || !regInput || !badge || !messages || !summaryText || !previewBtn || !submitBtn || !emailHidden || !idHidden || !amountExpected || !billDescType) {
    return;
  }

  // Set submit button disabled initially to enforce valid lookup
  submitBtn.disabled = true;

  let studentName = '';
  let debounceTimer: number | null = null;

  function showMessage(type: 'error' | 'success', text: string){
    if (messages) {
      messages.innerHTML = `<div class="alert ${type==='error' ? 'error' : 'success'}">${text}</div>`;
    }
  }

  function clearMessage(){ 
    if (messages) {
      messages.innerHTML = '<div class="page-title" role="heading" aria-level="1">Pay for Your Fees and Other Charges</div>';
    }
  }

  // debounce helper
  function debounce(fn: (...args: any[]) => void, wait: number){
    return function(...args: any[]){
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      debounceTimer = window.setTimeout(() => fn.apply(null, args), wait);
    }
  }

  // fetch student name (strict: only Anderson and Kelvin Maina allowed)
  async function fetchStudentName(regNo: string){
    if(!regNo || !badge) {
      studentName = '';
      if (badge) {
        badge.textContent = '';
        badge.classList.add('visually-hidden');
      }
      if (submitBtn) submitBtn.disabled = true;
      return;
    }

    badge.textContent = 'Searching...';
    badge.classList.remove('visually-hidden');

    try {
      await new Promise(resolve => setTimeout(resolve, 200));

      const cleanReg = regNo.toUpperCase().trim().replace(/[\/\s-]/g, '');
      
      const andersonReg = 'C0250108412022';
      const kelvinReg = 'C0250125662022';

      if (cleanReg === andersonReg) {
        studentName = 'ANDERSON NJOROGE MAINA';
      } else if (cleanReg === kelvinReg) {
        studentName = 'KELVIN MAINA NDEGWA';
      } else {
        studentName = '';
      }

      if (!studentName) {
        badge.textContent = 'Student Not Found';
        badge.classList.remove('visually-hidden');
        badge.classList.remove('stud-name');
        badge.classList.add('text-danger');
        if (submitBtn) submitBtn.disabled = true;
        return;
      }

      badge.textContent = studentName;
      badge.classList.remove('text-danger');
      badge.classList.remove('visually-hidden');
      badge.classList.add('stud-name');
      if (submitBtn) submitBtn.disabled = false;

      // derive fields for backend / SDK
      const trimmed = (studentName || '').replace(/\s+/g,'').replace(/[^a-zA-Z]/g,'');
      if (emailHidden) emailHidden.value = (trimmed ? trimmed.toLowerCase() : 'student') + '@gmail.com';
      if (idHidden) idHidden.value = msisdn ? msisdn.value : 'test123';
      clearMessage();
    } catch(e) {
      studentName = '';
      badge.classList.add('visually-hidden');
      if (submitBtn) submitBtn.disabled = true;
      console.warn('Student lookup error', e);
    }
  }

  const debouncedLookup = debounce((e: Event) => {
    const target = e.target as HTMLInputElement;
    fetchStudentName(target.value);
  }, 450);
  
  regInput.addEventListener('input', debouncedLookup);

  // sync fields
  function syncHiddenFields(){
    const trimmed = (studentName || '').replace(/\s+/g,'').replace(/[^a-zA-Z]/g,'');
    if (emailHidden && msisdn) {
      emailHidden.value = (trimmed ? trimmed.toLowerCase() : 'student') + '@gmail.com';
    }
    if (idHidden && msisdn) {
      idHidden.value = msisdn.value || '';
    }
  }

  msisdn.addEventListener('input', syncHiddenFields);
  regInput.addEventListener('input', syncHiddenFields);

  // Form validation
  function validateForm(){
    if(!form || !msisdn || !amountExpected) return false;
    
    if(!form.checkValidity()){
      form.reportValidity();
      return false;
    }
    
    const phone = msisdn.value.trim();
    const phoneOk = /^(2547\d{8}|07\d{8}|01\d{8}|2541\d{8})$/.test(phone);
    if(!phoneOk){
      showMessage('error', 'Phone number must be valid format (e.g. 2547xxxxxxxx, 07xxxxxxxx)');
      msisdn.focus();
      return false;
    }

    const amount = Number(amountExpected.value);
    if(!amount || amount < 1){
      showMessage('error','Please enter a valid amount (>= 1 KES).');
      amountExpected.focus();
      return false;
    }
    
    clearMessage();
    return true;
  }

  // Preview button
  previewBtn.addEventListener('click', function(){
    if(!validateForm() || !billDescType || !amountExpected || !msisdn || !regInput || !summaryText) return;
    const bill = billDescType.selectedOptions[0].textContent;
    const amount = amountExpected.value;
    const phone = msisdn.value;
    const reg = regInput.value;
    const student = studentName || '—';
    summaryText.innerHTML = `Bill: <strong>${bill}</strong><br>Amount: <strong>KES ${Number(amount).toLocaleString()}</strong><br>Phone: <strong>${phone}</strong><br>Reg No: <strong>${reg}</strong><br>Student: <strong>${student}</strong>`;
    window.scrollTo({top: summaryText.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth'});
  });

  // Submit handler
  form.addEventListener('submit', async function(e){
    e.preventDefault();
    if(!validateForm() || !msisdn || !amountExpected || !regInput || !submitBtn) return;
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Initiating M-Pesa...';
    
    try {
      const response = await fetch('/api/mpesa/initiate.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: msisdn.value.trim(),
          amount: parseFloat(amountExpected.value),
          description: `Fee Payment for ${regInput.value.trim()}`,
          userId: regInput.value.trim()
        })
      });

      const data = await response.json();

      if (data.success) {
        // Cache transaction details in Session Storage for PesaFlow Checkout page
        sessionStorage.setItem('eciti_reg', regInput.value.trim().toUpperCase());
        sessionStorage.setItem('eciti_phone', msisdn.value.trim());
        sessionStorage.setItem('eciti_amount', amountExpected.value.trim());
        sessionStorage.setItem('eciti_ref', data.checkoutRequestId || 'BAYLVMLG');
        sessionStorage.setItem('eciti_student_name', studentName);

        // Redirect immediately to PesaFlow payment selection page
        window.location.href = '/Payment/PaymentPesaFlow.html';
      } else {
        showMessage('error', `<strong>Payment Failed:</strong> ${data.message || 'Verification failed. Please try again.'}`);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Make Payment';
      }
    } catch (err: any) {
      console.error('[Payment Error]', err);
      showMessage('error', `<strong>Error:</strong> Failed to communicate with payment gateway. Please check your network connection.`);
      submitBtn.disabled = false;
      submitBtn.textContent = 'Make Payment';
    }
  });

  // Enter key trigger preview
  form.addEventListener('keydown', function(e){
    if(e.key === 'Enter' && (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement)){
      e.preventDefault();
      previewBtn.click();
    }
  });

  // Scroll navbar shadow
  const nav = document.getElementById('mainNavbar');
  if (nav) {
    window.addEventListener('scroll', () => {
      if(window.scrollY > 8) nav.classList.add('navbar-scrolled');
      else nav.classList.remove('navbar-scrolled');
    }, {passive:true});
  }
})();
