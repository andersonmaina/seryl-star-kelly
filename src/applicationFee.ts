(function () {
  const MAX_AMOUNT = 3000;
  const form = document.getElementById('appFeeForm') as HTMLFormElement | null;
  const amountEl = document.getElementById('amountExpected') as HTMLInputElement | null;
  const phoneEl = document.getElementById('clientMSISDN') as HTMLInputElement | null;
  const nameEl = document.getElementById('clientName') as HTMLInputElement | null;
  const summaryText = document.getElementById('summaryText') as HTMLDivElement | null;
  const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement | null;
  const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement | null;
  const amountWarning = document.getElementById('amountWarning') as HTMLDivElement | null;
  const phoneWarning = document.getElementById('phoneWarning') as HTMLDivElement | null;
  const emailHidden = document.getElementById('clientEmail') as HTMLInputElement | null;
  const idHidden = document.getElementById('clientIDNumber') as HTMLInputElement | null;
  const messages = document.getElementById('messages') as HTMLDivElement | null;

  if (!form || !amountEl || !phoneEl || !nameEl || !summaryText || !previewBtn || !submitBtn || !amountWarning || !phoneWarning || !emailHidden || !idHidden || !messages) {
    return;
  }

  function showMessage(type: 'error' | 'success', text: string) {
    if (messages) {
      messages.innerHTML = `<div class="alert ${type==='error' ? 'error' : 'success'}">${text}</div>`;
    }
  }
  
  function clearMessage(){
    if (messages) {
      messages.innerHTML = '<div class="page-title" role="heading" aria-level="1">Application fee only for new students</div>';
    }
  }

  // Sync hidden fields (email derived from name, ID derived from phone)
  function syncHiddenFields() {
    if (!nameEl || !phoneEl || !emailHidden || !idHidden) return;
    const clientName = nameEl.value.replace(/\s+/g, ' ').trim();
    const clientMSISDN = phoneEl.value.trim();
    const clientEmail = clientName.replace(/\s/g, '') + '@gmail.com';
    emailHidden.value = clientEmail.toLowerCase();
    idHidden.value = clientMSISDN;
  }

  nameEl.addEventListener('input', syncHiddenFields);
  phoneEl.addEventListener('input', syncHiddenFields);

  // Validate amount
  function validateAmount() {
    if (!amountEl || !amountWarning) return false;
    const v = Number(amountEl.value);
    if (!v || v <= 0) {
      amountEl.classList.add('is-invalid');
      amountWarning.textContent = 'Please enter a valid amount greater than zero.';
      amountWarning.style.display = 'block';
      return false;
    }
    if (v > MAX_AMOUNT) {
      amountEl.classList.add('is-invalid');
      amountWarning.textContent = 'The application fee should not exceed KES ' + MAX_AMOUNT.toLocaleString() + '.';
      amountWarning.style.display = 'block';
      return false;
    }
    amountEl.classList.remove('is-invalid');
    amountWarning.style.display = 'none';
    return true;
  }

  // Validate phone number
  function validatePhone() {
    if (!phoneEl || !phoneWarning) return false;
    const phone = phoneEl.value.trim();
    const phoneOk = /^(2547\d{8}|07\d{8}|01\d{8}|2541\d{8})$/.test(phone);
    if (!phoneOk) {
      phoneEl.classList.add('is-invalid');
      phoneWarning.style.display = 'block';
      return false;
    }
    phoneEl.classList.remove('is-invalid');
    phoneWarning.style.display = 'none';
    return true;
  }

  amountEl.addEventListener('input', validateAmount);
  phoneEl.addEventListener('input', validatePhone);

  // Preview handler
  previewBtn.addEventListener('click', function () {
    if (!form || !amountEl || !phoneEl || !nameEl || !summaryText) return;
    clearMessage();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (!validateAmount() || !validatePhone()) {
      showMessage('error', 'Please fix validation errors before previewing.');
      return;
    }
    const amount = Number(amountEl.value).toFixed(0);
    const phone = phoneEl.value;
    const name = nameEl.value || '—';
    summaryText.innerHTML = `Bill: <strong>Application Fee</strong><br>Amount: <strong>KES ${Number(amount).toLocaleString()}</strong><br>Phone: <strong>${phone}</strong><br>Name: <strong>${name}</strong><br>`;
    summaryText.scrollIntoView({behavior: 'smooth', block: 'center'});
  });

  // Submit handler
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!amountEl || !phoneEl || !nameEl || !submitBtn) return;
    clearMessage();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    if (!validateAmount() || !validatePhone()) {
      showMessage('error', 'Please fix validation errors before submitting.');
      return;
    }
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Initiating M-Pesa...';
    
    try {
      const response = await fetch('/api/mpesa/initiate.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: phoneEl.value.trim(),
          amount: parseFloat(amountEl.value),
          description: `Application Fee for ${nameEl.value.trim()}`,
          userId: nameEl.value.trim().toLowerCase().replace(/\s+/g, '_')
        })
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', `<strong>M-Pesa STK Push Sent!</strong><br>${data.message || 'Please check your phone and enter your M-Pesa PIN to complete payment.'}<br><span class="small text-muted">Order ID: ${data.orderId || 'N/A'}</span>`);
      } else {
        showMessage('error', `<strong>Payment Failed:</strong> ${data.message || 'Verification failed. Please try again.'}`);
      }
    } catch (err: any) {
      console.error('[Payment Error]', err);
      showMessage('error', `<strong>Error:</strong> Failed to communicate with payment gateway. Please check your network connection.`);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Make Payment';
    }
  });

  // Enter key trigger preview
  form.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && (ev.target instanceof HTMLInputElement || ev.target instanceof HTMLSelectElement)) {
      ev.preventDefault();
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
