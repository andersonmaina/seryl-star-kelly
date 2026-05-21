(function () {
  // Read details from Session Storage or fallback to URL query parameters
  const params = new URLSearchParams(window.location.search);
  const reg = sessionStorage.getItem('eciti_reg') || params.get('reg') || 'C025-01-0841/2022';
  const phone = sessionStorage.getItem('eciti_phone') || params.get('phone') || '254702861379';
  const amountVal = sessionStorage.getItem('eciti_amount') || params.get('amount') || '1.00';

  // Format amount to double decimal float
  const formattedAmount = parseFloat(amountVal).toFixed(2);

  // Render variables into DOM elements
  const metaEl = document.getElementById('metaDetails');
  const billEl = document.getElementById('totalBill');
  const providerEl = document.getElementById('providerDetails');

  // Resolve student name dynamically
  let studentName = sessionStorage.getItem('eciti_student_name') || '';
  if (!studentName) {
    const cleanReg = reg.toUpperCase().trim().replace(/[\/\s-]/g, '');
    if (cleanReg === 'C0250108412022') {
      studentName = 'ANDERSON NJOROGE MAINA';
    } else if (cleanReg === 'C0250125662022') {
      studentName = 'KELVIN MAINA NDEGWA';
    } else {
      studentName = 'ANDERSON NJOROGE MAINA'; // default fallback
    }
  }

  if (metaEl) {
    metaEl.textContent = `${reg}, ${phone}`;
  }
  if (billEl) {
    billEl.textContent = `KES ${parseFloat(formattedAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  }
  if (providerEl) {
    providerEl.innerHTML = `ECITIZEN<br>EQUITY ACCOUNT IN FAVOR OF ${studentName.toUpperCase()},<br>PROVIDER: SKYLINK SCOPE TECHNOLOGIES`;
  }

  // Bind interactive events to payment options for excellent user feedback
  const paymentButtons = document.querySelectorAll('.payment-btn');
  paymentButtons.forEach(btn => {
    btn.addEventListener('click', function () {
      const mode = btn.querySelector('span')?.textContent || btn.textContent || '';
      alert(`Initiating checkout process using: ${mode.trim()}`);
    });
  });

  // Scroll navbar shadow
  const nav = document.getElementById('mainNavbar');
  if (nav) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 8) nav.classList.add('navbar-scrolled');
      else nav.classList.remove('navbar-scrolled');
    }, { passive: true });
  }
})();
