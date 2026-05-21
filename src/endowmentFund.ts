(function () {
  const previewBtn = document.getElementById('previewBtn') as HTMLButtonElement | null;
  const summaryText = document.getElementById('summaryText') as HTMLDivElement | null;
  const form = document.getElementById('paymentForm') as HTMLFormElement | null;
  const submitBtn = document.getElementById('submitBtn') as HTMLButtonElement | null;
  const amountEl = document.getElementById('amountExpected') as HTMLInputElement | null;
  const phoneEl = document.getElementById('clientMSISDN') as HTMLInputElement | null;
  const nameEl = document.getElementById('clientName') as HTMLInputElement | null;
  const messages = document.getElementById('messages') as HTMLDivElement | null;

  if (!previewBtn || !summaryText || !form || !submitBtn || !amountEl || !phoneEl || !nameEl || !messages) {
    return;
  }

  function showMessage(type: 'error' | 'success', text: string) {
    if (messages) {
      messages.innerHTML = `<div class="alert ${type==='error' ? 'error' : 'success'}">${text}</div>`;
    }
  }

  function clearMessage(){
    if (messages) {
      messages.innerHTML = `
        <div class="page-title" role="heading" aria-level="1">Endowment Fund Contribution</div>
        <p class="muted text-center">Support DeKUT by contributing to the Endowment Fund.</p>
      `;
    }
  }

  function validateForm() {
    if (!form || !phoneEl || !amountEl) return false;

    if (!form.checkValidity()) {
      form.reportValidity();
      return false;
    }

    const phone = phoneEl.value.trim();
    const phoneOk = /^(2547\d{8}|07\d{8}|01\d{8}|2541\d{8})$/.test(phone);
    if (!phoneOk) {
      showMessage('error', 'Phone number must be valid format (e.g. 2547xxxxxxxx, 07xxxxxxxx)');
      phoneEl.focus();
      return false;
    }

    const amount = Number(amountEl.value);
    if (!amount || amount < 1) {
      showMessage('error', 'Please enter a valid amount (>= 1 KES).');
      amountEl.focus();
      return false;
    }

    clearMessage();
    return true;
  }

  previewBtn.addEventListener('click', function () {
    if (!validateForm() || !nameEl || !phoneEl || !amountEl || !summaryText) return;

    const name = nameEl.value;
    const phone = phoneEl.value;
    const amount = amountEl.value;

    summaryText.innerHTML = `
      Contributor: <strong>${name}</strong><br>
      Amount: <strong>KES ${Number(amount).toLocaleString()}</strong><br>
      Phone: <strong>${phone}</strong><br>
      Purpose: <strong>Endowment Fund</strong>
    `;
  });

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!validateForm() || !phoneEl || !amountEl || !nameEl || !submitBtn) return;

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
          description: `Endowment Contribution from ${nameEl.value.trim()}`,
          userId: nameEl.value.trim().toLowerCase().replace(/\s+/g, '_')
        })
      });

      const data = await response.json();

      if (data.success) {
        showMessage('success', `<strong>M-Pesa STK Push Sent!</strong><br>${data.message || 'Please check your phone and enter your M-Pesa PIN to complete contribution.'}<br><span class="small text-muted">Order ID: ${data.orderId || 'N/A'}</span>`);
      } else {
        showMessage('error', `<strong>Contribution Failed:</strong> ${data.message || 'Verification failed. Please try again.'}`);
      }
    } catch (err: any) {
      console.error('[Payment Error]', err);
      showMessage('error', `<strong>Error:</strong> Failed to communicate with payment gateway. Please check your network connection.`);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Make Contribution';
    }
  });

  // Enter key trigger preview
  form.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.target instanceof HTMLInputElement)) {
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
