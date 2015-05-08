// DOMContentLoaded is fired once the document has been loaded and parsed,
// but without waiting for other external resources to load (css/images/etc)
// That makes the app more responsive and perceived as faster.
// https://developer.mozilla.org/Web/Reference/Events/DOMContentLoaded
window.addEventListener('DOMContentLoaded', function() {
  // We'll ask the browser to use strict code to help us catch errors earlier.
  // https://developer.mozilla.org/Web/JavaScript/Reference/Functions_and_function_scope/Strict_mode
  'use strict';

  var moment = window.moment;
  var tpls = {};

  function initTemplate() {
    tpls.contactsDom = document.querySelector('.js-contacts');
    tpls.contactDom = tpls.contactsDom.querySelector('.js-contact');
    template();
  }

  /*
  function getContacts() {
    var cursor = window.navigator.mozContacts.getAll(options);

    cursor.addEventListener('success', function () {
      console.log("Contact found: " + this.result.name);

      // Once we found a file we check if there is other results
      if (!this.done) {
        // Then we move to the next result, which call the
        // cursor success with the next file as result.
        this.continue();
      }
    });
  }
  */

  function template() {
    var msg = window.localStorage.getItem('msg') || '';
    var residents = JSON.parse(window.localStorage.getItem('residents') || '[]');

    document.querySelector('.js-message').value = msg;
    //var contactsDom = document.querySelector('.js-contacts');
    //var contactDom = contactsDom.querySelector('.js-contact');
    var html = "";

    residents.forEach(function (resident, i) {
      var telHtml = tpls.contactDom.querySelector('.js-tel');
      var nameHtml = tpls.contactDom.querySelector('.js-name');
      var deleteHtml = tpls.contactDom.querySelector('.js-delete');

      telHtml.textContent = resident.tel;
      nameHtml.textContent = resident.name;
      deleteHtml.dataset.contactId = i;

      html += tpls.contactDom.innerHTML;
    });

    tpls.contactsDom.innerHTML = html;
  }

  function deleteAllAlarms(alarms) {
    alarms.forEach(function (alarm) {
      navigator.mozAlarms.remove(alarm.id);
    });
  }

  function setAlarm(d) {
    if (!d || !d.valueOf()) {
      window.alert("Error: no date");
      return;
    }

    // state is used to guard against system level alarms
    var state = Math.random().toString();
    localStorage.setItem('state', state);
    // moment defaults to current Locale, not UTC
    // isoweek starts on monday regardless of locale

    var result = navigator.mozAlarms.getAll();
    result.addEventListener('success', function (ev) {
      var alarms = ev.target.result;

      deleteAllAlarms(alarms);
      navigator.mozAlarms.add(d, "honorTimezone", { state: state });
    });
    result.addEventListener('error', function () {
      // no idea what to do
    });
    //console.log(d.toString());
    //return navigator.mozAlarms.add(d, "honorTimezone", { state: state });
  }

  function pad(c) {
    c = c.toString();
    if (c.length < 2) {
      c = '0' + c;
    }
    return c;
  }

  function templateAlarm(date) {
    document.querySelector('.js-date').value =
      date.getFullYear() + '-'
    + pad(date.getMonth() + 1) + '-'
    + pad(date.getDate())
    ;
    document.querySelector('.js-time').value =
      date.getHours() + ':'
    + pad(date.getMinutes())
    ;
  }

  function initAlarm(date) {
    var alarmsResult = navigator.mozAlarms.getAll();

    alarmsResult.addEventListener('success', function (ev) {
      var alarms = ev.target.result;
      var date;

      if (alarms.length === 1) {
        date = alarms[0].date;
        // all is well, nothing to do
        //window.alert('data: ' + JSON.stringify(alarms[0]).date);
        templateAlarm(date);
      } else {
        if (alarms.length !== 0) {
          console.log(ev);
          window.alert("something went wrong");
          deleteAllAlarms(alarms);
        }

        date = moment().add(1, 'weeks');
        setAlarm(date);
      }
    });

    alarmsResult.addEventListener('error', function (err) {
      console.error(err);
    });

    window.navigator.mozSetMessageHandler("alarm", function (mozAlarm) {
      var data = mozAlarm.data;
      var state = localStorage.getItem('state');
      var msg = window.localStorage.getItem('msg');
      var residents = JSON.parse(window.localStorage.getItem('residents') || '[]');
      var nextWeek = moment(mozAlarm.date).add(1, 'weeks').toDate();

      if (state !== data.state) {
        // this may be a system-level alarm
        return;
      }

      console.log('nextWeek');
      console.log(nextWeek);
      setAlarm(nextWeek);

      if (Date.now() - mozAlarm.date.valueOf() > (16 * 60 * 60 * 1000)) {
        window.alert("missed an alarm");
        return;
      }

      console.log('mozAlarm');
      console.log('id:', mozAlarm.id);
      console.log('date:', mozAlarm.date);
      console.log('date (string):', mozAlarm.date.toString());
      console.log('respectTimezone:', mozAlarm.respectTimezone);
      console.log('data:', mozAlarm.data);
      console.log('\n\n\n');

      residents.forEach(function (resident) {
        sendMessage(resident.tel, msg);
      });

      template();
      templateAlarm(nextWeek);
    });
  }

  function sendMessage(number, message) {
    console.log("THIS EVENT IS HAPPENING!!!", number, message);

    var result = navigator.mozMobileMessage.send(number, message);

    result.addEventListener('success', function () {
      console.log('success', number);
      // window.alert("Congrats! Sent the message!");
    });

    result.addEventListener('error', function (err) {
      console.error('error');
      console.error(err);
      window.alert("Suxorz! Send FAILED!");
    });

    console.log("\n\n\n");
  }

  function addContact(contact) {
    console.log('addContact', contact);
    if (!contact.name || !contact.tel) {
      return false;
    }

    var residents = JSON.parse(window.localStorage.getItem('residents') || '[]');
    residents.push(contact);
    window.localStorage.setItem('residents', JSON.stringify(residents));
    return true;
  }

  function deleteContact(contactIndex) {
    var residents = JSON.parse(window.localStorage.getItem('residents') || '[]');
    var deleted;

    residents.some(function (contact, i) {
      if (i.toString() === contactIndex.toString()) {
        deleted = residents.splice(i, 1)[0];
        return true;
      }
    });

    //console.log('DELETE residents');
    //console.log(residents);
    //console.log(deleted);
    window.localStorage.setItem('residents', JSON.stringify(residents));

    return deleted;
  }

  document.body.addEventListener('click', function (ev) {
    //var contactDom = document.querySelector('.js-contact-add');
    var result;
    var dateStr;

    if (-1 !== ev.target.className.indexOf("js-contact-clear")) {
      document.querySelector('.js-contact-name').value = '';
      document.querySelector('.js-contact-tel').value = '';
      return;
    }

    if (-1 !== ev.target.className.indexOf("js-delete")) {
      console.log('DELETE', ev.target.dataset.contactId);
      result = deleteContact(ev.target.dataset.contactId);
      document.querySelector('.js-contact-name').value = result.name;
      document.querySelector('.js-contact-tel').value = result.tel;
      template();
      return;
    }

    if (-1 !== ev.target.className.indexOf("js-contact-save")) {
      console.log('ADD', ev.target.dataset.contactId);

      result = {
        name: document.querySelector('.js-contact-name').value
      , tel: document.querySelector('.js-contact-tel').value
      };

      if (addContact(result)) {
        document.querySelector('.js-contact-name').value = '';
        document.querySelector('.js-contact-tel').value = '';
        template();
      }

      return;
    }

    if (-1 !== ev.target.className.indexOf("js-message-save")) {
      console.log('message-save');
      var message = document.querySelector('.js-message').value;

      console.log('date', document.querySelector('.js-date').value);
      console.log('time', document.querySelector('.js-time').value);

      dateStr = document.querySelector('.js-date').value
        + 'T' + document.querySelector('.js-time').value + ':00'
        //+ (new Date().toString().replace(/.*([\-\+]\d+).*/, '$1'))
        ;

      console.log('dateStr');
      console.log(dateStr);
      console.log(new Date(dateStr).toString());
      console.log("\n\n\n");

      localStorage.setItem('msg', message);
      setAlarm(new Date(dateStr));
      template();
      return;
    }
  });

  initTemplate();
  initAlarm();
});
