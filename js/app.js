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

  function template() {
    var msg = window.localStorage.getItem('msg');
    var residents = JSON.parse(window.localStorage.getItem('residents') || []);

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
   
  function setAlarm() {
    // state is used to guard against system level alarms
    var state = Math.random().toString();
    // moment defaults to current Locale, not UTC
    // isoweek starts on monday regardless of locale
    var d = moment().startOf('isoweek')
      // extra minute is because... I dunno... somehow a minute gets lost
      .add(1, 'days').add('12', 'hours').add(7, 'hours').add(1, 'minutes')
      .toDate()
      ;
    
    console.log(d.toString());
    
    if (d.valueOf() < Date.now()) {
      console.log("This tuesday has passed");
      d = moment().endOf('isoweek')
        .add(1, 'days').add('12', 'hours').add(7, 'hours')
        .toDate()
        ;
      console.log(d.toString());
    }
    
    //d = moment().add(60, 'seconds').toDate();
    localStorage.setItem('state', state);
    
    console.log(d.toString());
    return navigator.mozAlarms.add(d, "honorTimezone", { state: state });
  }

  function pad(c) {
    c = c.toString();
    if (c.length < 2) {
      c = '0' + c;
    }
    return c;
  }

  function initAlarm() {
    var alarmsResult = navigator.mozAlarms.getAll();

    alarmsResult.addEventListener('success', function (ev) {
      var alarms = ev.target.result;
      var date;

      if (alarms.length === 1) {
        date = alarms[0].date;
        // all is well, nothing to do
        //window.alert('data: ' + JSON.stringify(alarms[0]).date);
        document.querySelector('.js-date').value = 
          date.getFullYear() + '-'
        + pad(date.getMonth() + 1) + '-' 
        + pad(date.getDate())
        ;
        document.querySelector('.js-time').value =
          date.getHours() + ':'
        + pad(date.getMinutes())
        ;
      } else if (alarms.length === 0) {
        setAlarm();
      } else {
        console.log(ev);
        window.alert("something went wrong");
      }  
    });
    
    alarmsResult.addEventListener('error', function (err) {
      console.error(err);
    });

    window.navigator.mozSetMessageHandler("alarm", function (mozAlarm) {
      var data = mozAlarm.data;
      var state = localStorage.getItem('state');
      var msg = window.localStorage.getItem('msg');
      var residents = JSON.parse(window.localStorage.getItem('residents') || []);
      
      if (state !== data.state) {
        // this may be a system-level alarm
        return;
      }
      
      setAlarm();
      
      if (Date.now() - mozAlarm.date.valueOf() > (16 * 60 * 60 * 1000)) {
        window.alert("missed an alarm");
        return;
      }
      
      console.log('mozAlarm');
      console.log('id:', mozAlarm.id);
      console.log('date:', mozAlarm.date.toString());
      console.log('respectTimezone:', mozAlarm.respectTimezone);
      console.log('data:', mozAlarm.data);
      
      residents.forEach(function (resident) {
        sendMessage(resident.tel, msg);
      });
    });    
  }
  
  function sendMessage(number, message) {
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
  }
  
  initTemplate();
  initAlarm();

  function addContact(contact) {
    if (!contact.name || !contact.tel) {
      return false;
    }

    var residents = JSON.parse(window.localStorage.getItem('residents') || []);
    residents.push(contact);
    window.localStorage.setItem('residents', JSON.stringify(residents));
    return true;
  }

  function deleteContact(contactIndex) {
    var residents = JSON.parse(window.localStorage.getItem('residents') || []);
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
      localStorage.setItem('msg', message);
      template();
      return;
    }
  });
});
