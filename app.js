'use strict';

document.addEventListener('DOMContentLoaded', function() {

  // =============================================
  // GATEKEEPER AUTH
  // =============================================
  var gatekeeperScreen = document.getElementById('gatekeeper-screen');
  var appContainer     = document.getElementById('app-container');
  var gatekeeperForm   = document.getElementById('gatekeeper-form');
  var passcodeInput    = document.getElementById('passcode-input');

  function unlockApp() {
    gatekeeperScreen.style.display = 'none';
    appContainer.removeAttribute('hidden');
    appContainer.style.display = 'block';
  }

  if (localStorage.getItem('auth') === 'verified') {
    unlockApp();
  }

  gatekeeperForm.addEventListener('submit', function(e) {
    e.preventDefault();
    if (passcodeInput.value === 'boarshead') {
      localStorage.setItem('auth', 'verified');
      unlockApp();
    }
  });

  // =============================================
  // DRAWER NAVIGATION
  // =============================================
  var hamburgerBtn = document.getElementById('hamburger-btn');
  var sideDrawer   = document.getElementById('side-drawer');
  var overlay      = document.getElementById('overlay');

  function openDrawer() {
    sideDrawer.classList.add('open');
    overlay.style.display = 'block';
    hamburgerBtn.setAttribute('aria-expanded', 'true');
  }

  function closeDrawer() {
    sideDrawer.classList.remove('open');
    overlay.style.display = 'none';
    hamburgerBtn.setAttribute('aria-expanded', 'false');
  }

  hamburgerBtn.addEventListener('click', openDrawer);
  overlay.addEventListener('click', closeDrawer);

  // =============================================
  // PAGE ROUTING
  // =============================================
  var allPages = ['main-expense-view', 'fleet-health-page', 'push-list-page', 'roadmap-page'];

  function navigateTo(pageId) {
    allPages.forEach(function(id) {
      var el = document.getElementById(id);
      if (el) {
        el.style.display = (id === pageId) ? 'block' : 'none';
      }
    });
  }

  // Drawer links — close drawer then navigate
  sideDrawer.querySelectorAll('.drawer-link').forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      closeDrawer();
      navigateTo(link.getAttribute('data-page'));
    });
  });

  // Back links on placeholder pages
  document.querySelectorAll('.back-link').forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      navigateTo(link.getAttribute('data-page'));
    });
  });

  // =============================================
  // RECEIPT FILE INPUT
  // =============================================
  var receiptUpload    = document.getElementById('receipt-upload');
  var receiptLabel     = document.getElementById('receipt-upload-label');
  var receiptLabelText = document.getElementById('receipt-upload-text');

  receiptUpload.addEventListener('change', function() {
    if (receiptUpload.files && receiptUpload.files.length > 0) {
      receiptLabelText.textContent = 'Receipt Attached (1)';
      receiptLabel.classList.add('has-file');
    } else {
      receiptLabelText.textContent = 'Attach Receipt Photo';
      receiptLabel.classList.remove('has-file');
    }
  });

});
