import { getHours } from '$utils/getHours';

window.Webflow ||= [];
window.Webflow.push(() => {
  // --- GET ACTIVE TAB ---
  const urlParams = new URLSearchParams(window.location.search);
  const tabParam = urlParams.get('p');
  const familyTabLink = document.querySelector<HTMLElement>('[ll-selector="fam-tab"]');
  const groupTabLink = document.querySelector<HTMLElement>('[ll-selector="group-tab"]');

  if (tabParam === 'group' && groupTabLink) {
    // If URL says "group", click the Group tab
    groupTabLink.click();
  } else if (tabParam === 'family' && familyTabLink) {
    // If URL says "family", click the Family tab
    familyTabLink.click();
  }

  const hoursElements = Array.from(document.querySelectorAll<HTMLElement>('[data-role="hours"]'));
  getHours(hoursElements);
  //console.log('hours', hoursData);

  // --- CONFIGURATION ---
  const SHOP_DOMAIN = 'shop.lostlevelsarcade.com';
  const FAMILY_PASS_VARIANT_ID = '51338468294952';
  const GROUP_DEPOSIT_VARIANT_ID = '51338468458792';
  const FAMILY_FORM_ID = 'family-form';
  const GROUP_FORM_ID = 'group-form';

  // --- HELPERS ---
  function getBase64Properties(formData) {
    const data = {};
    for (const [key, value] of formData.entries()) {
      if (value && key !== 'submit') {
        const lowerKey = key.charAt(0).toUpperCase() + key.slice(1);
        data[lowerKey] = value;
      }
    }
    const jsonString = JSON.stringify(data);
    return window.btoa(jsonString);
  }
  function showErrorMessage(form: HTMLFormElement, message: string) {
    const errorEl = form.parentElement?.querySelector('.form-message-error') as HTMLElement;
    if (errorEl) {
      errorEl.textContent = message; // Update text dynamically
      errorEl.style.display = 'block'; // Reveal it
      setTimeout(() => {
        errorEl.style.display = 'none';
      }, 7000);
    } else {
      console.error('No .form-message-error element found');
    }
  }

  // --- MAIN: Redirect Handler ---
  function handleBookingSubmit(event, variantId) {
    event.preventDefault();
    const form = event.target;
    // --- VALIDATION STEP ---
    let quantity = 1;
    const qtyInput = form.querySelector('[ll-selector="group-size"]') as HTMLInputElement;
    if (qtyInput && qtyInput.value) {
      const parsedQty = parseInt(qtyInput.value, 10);
      if (form.id === 'group-form') {
        if (parsedQty < 5) {
          showErrorMessage(form, 'A minimum of 5 people is required');
          qtyInput.focus();
          return;
        }
        quantity = parsedQty;
      }
    }
    const dateInput = form.querySelector('[ll-selector="flatpickr-date"]') as HTMLInputElement;
    const dateVal = dateInput.value;
    const timeVal = (form.querySelector('[ll-selector="flatpickr-time"]') as HTMLInputElement)
      .value;

    if (!dateVal || !timeVal) {
      showErrorMessage(form, 'Please select both a Date and Time.');
      dateInput.focus();
      return;
    }
    const submitBtn = form.querySelector('input[type="submit"], .w-button');
    if (submitBtn) {
      submitBtn.value = 'Submitting...';
      submitBtn.style.opacity = '0.7';
    }
    const formData = new FormData(form);
    const encodedProperties = getBase64Properties(formData);
    const url = `https://${SHOP_DOMAIN}/cart/${variantId}:${quantity}?channel=buy_button&properties=${encodedProperties}`;
    //console.log(url);
    window.location.href = url;
  }

  // --- INITIALIZATION: Attach Listeners ---
  const familyForm = document.getElementById(FAMILY_FORM_ID);
  const groupForm = document.getElementById(GROUP_FORM_ID);
  if (familyForm) {
    familyForm.addEventListener('submit', function (e) {
      handleBookingSubmit(e, FAMILY_PASS_VARIANT_ID);
    });
  }
  if (groupForm) {
    groupForm.addEventListener('submit', function (e) {
      handleBookingSubmit(e, GROUP_DEPOSIT_VARIANT_ID);
    });
  }

  // RESET BUTTON STATE on BACK
  window.addEventListener('pageshow', function (event) {
    // Check if the page was restored from the bfcache
    if (event.persisted || (window.performance && window.performance.navigation.type === 2)) {
      // Reset Family Button
      const familyBtn = document.querySelector<HTMLButtonElement>(
        `#${FAMILY_FORM_ID} input[type="submit"], #${FAMILY_FORM_ID} .w-button`
      );
      if (familyBtn) {
        familyBtn.value = 'Reserve Your Pass';
        familyBtn.style.opacity = '1';
      }
      // Reset Group Button
      const groupBtn = document.querySelector<HTMLButtonElement>(
        `#${GROUP_FORM_ID} input[type="submit"], #${GROUP_FORM_ID} .w-button`
      );
      if (groupBtn) {
        groupBtn.value = 'Reserve Your Pass';
        groupBtn.style.opacity = '1';
      }
    }
  });
});
