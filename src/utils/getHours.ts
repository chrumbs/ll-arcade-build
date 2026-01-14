import flatpickr from 'flatpickr';

interface FlatpickrInput extends HTMLInputElement {
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  _flatpickr?: any;
}

export const getHours = (hoursElements: HTMLElement[]) => {
  const rawHours: Record<number, string> = {};
  hoursElements.forEach((element, index) => {
    const hour = element.textContent || '';
    rawHours[index] = hour;
  });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const rawHoursDebug = {
    0: '11:00am - 7:00pm', // Replace text with CMS Field: Sunday Hours
    1: 'Closed', // Replace text with CMS Field: Monday Hours
    2: 'Closed', // Replace text with CMS Field: Tuesday Hours
    3: '12:00pm - 9:00pm', // Replace text with CMS Field: Wednesday Hours
    4: '12:00pm - 10:00pm', // Replace text with CMS Field: Thursday Hours
    5: '12:00pm - 12:00am', // Replace text with CMS Field: Friday Hours
    6: '10:00am - 12:00am', // Replace text with CMS Field: Saturday Hours
  };

  function subtractMinutes(timeStr: string, mins: number): string {
    if (!timeStr) return '23:59';

    const [hoursStr, minutes] = timeStr.split(':').map(Number);
    let hours = hoursStr;
    if (hours === 0 && timeStr !== '00:00') hours = 0;
    if (hours === 0 && timeStr === '00:00') hours = 24;

    const totalMinutes = hours * 60 + minutes - mins;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;

    // Handle wraps nicely
    const finalHours = newHours < 0 ? 24 + newHours : newHours;

    return `${finalHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  }

  function convertTo24Hour(timeStr) {
    // Handle "Closed" or empty cases safely
    if (!timeStr || timeStr.toLowerCase().includes('close')) return null;

    const [time, modifier] = timeStr.split(/(am|pm)/i);
    // Safety check if split failed
    if (!modifier) return timeStr;

    const [time_hours, minutes] = time.split(':').map(Number);
    let hours = time_hours;
    if (modifier.toLowerCase() === 'pm' && hours !== 12) {
      hours += 12;
    }
    if (modifier.toLowerCase() === 'am' && hours === 12) {
      hours = 0; // Midnight case
    }
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  function parseStoreHours(hoursStr) {
    if (!hoursStr || hoursStr.toLowerCase().includes('close')) return null;
    hoursStr = hoursStr.replace(/–/g, '-').trim();
    // Safety: ensure dash exists
    if (!hoursStr.includes('-')) return null;

    const [startRaw, endRaw] = hoursStr.split('-').map((s) => s.trim());
    const startTime = convertTo24Hour(startRaw);
    const endTime = convertTo24Hour(endRaw);

    if (!startTime || !endTime) return null;

    return { startTime, endTime };
  }

  const storeHoursConfig: Record<number, { open: string; close: string }> = {};
  const closedDays: ((date: Date) => boolean)[] = [];

  // Loop through days 0 (Sun) to 6 (Sat)
  for (let i = 0; i < 7; i++) {
    const hoursData = parseStoreHours(rawHours[i]);

    if (hoursData) {
      // Store Open: Add to config
      // Handle Midnight wrap (if closes at 2am, we cap booking at 23:30 for that day)
      let finalClose = hoursData.endTime;
      if (hoursData.endTime < hoursData.startTime) {
        finalClose = '23:59';
      }

      storeHoursConfig[i] = {
        open: hoursData.startTime,
        close: finalClose,
      };
    } else {
      // Store Closed: Add to "disable" list
      closedDays.push((date: Date): boolean => {
        // Flatpickr disable function: returns true if date matches this day index
        return date.getDay() === i;
      });
    }
  }

  function getBufferForInput(inputElement: HTMLElement): number {
    const form = inputElement.closest('form');
    if (form && form.id === 'group-form') {
      return 120; // 2 Hours for Group
    }
    return 60; // Default (Family) is 1 Hour
  }

  // Initialize TIME pickers
  flatpickr('[ll-selector="flatpickr-time"]', {
    enableTime: true,
    noCalendar: true,
    dateFormat: 'h:i K',
    time_24hr: false,
    minuteIncrement: 30,
    disableMobile: true,
  });

  // Initialize DATE pickers
  flatpickr('[ll-selector="flatpickr-date"]', {
    dateFormat: 'Y-m-d',
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    minDate: (new Date() as any).fp_incr(1),
    disable: closedDays,
    disableMobile: true,
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    onChange: function (selectedDates: Date[], dateStr: string, instance: any) {
      if (selectedDates.length === 0) return;

      const dayOfWeek = selectedDates[0].getDay();
      const hours = storeHoursConfig[dayOfWeek];

      // Find sibling inputs
      const dateInput = instance.element as HTMLElement;
      const wrapper = dateInput.closest('[ll-selector="flatpickr-wrapper"]');
      if (!wrapper) return;
      const timeInput = wrapper.querySelector('[ll-selector="flatpickr-time"]') as FlatpickrInput;

      if (timeInput && timeInput._flatpickr && hours) {
        const fpTime = timeInput._flatpickr;
        // === DYNAMIC BUFFER LOGIC ===
        // 1. Determine which form we are in
        const currentBuffer = getBufferForInput(dateInput);
        // 2. Calculate Max Time specifically for this form
        const calculatedMaxTime = subtractMinutes(hours.close, currentBuffer);
        // 3. Apply settings
        fpTime.set('minTime', hours.open);
        fpTime.set('maxTime', calculatedMaxTime);
        timeInput.disabled = false;
        timeInput.placeholder = 'Select Time';
        fpTime.clear();
      }
    },
  });

  return { storeHoursConfig, closedDays };
};
