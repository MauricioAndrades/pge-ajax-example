try {
  // hashchange polyfill: adds ability to detect hashchange on browsers that do not have the event.
  (function() {
    // exit if the browser implements that event
    if ("onhashchange" in window) {
      return
    }
    var location = window.location,
    oldURL = location.href,
    oldHash = location.hash;
    // check the location hash on a 100ms interval
    setInterval(function() {
      var newURL = location.href,
      newHash = location.hash;
      // if the hash has changed and a handler has been bound...
      if (newHash != oldHash && typeof window.onhashchange === "function") {
        // execute the handler
        window.onhashchange({
          type: "hashchange",
          oldURL: oldURL,
          newURL: newURL
        });
        oldURL = newURL;
        oldHash = newHash
      }
    }, 500);
  })();


  /////////////////////////////////////////
  // DEFINE THE HASHCHANGE EVENT HANDLER //
  /////////////////////////////////////////
  window.hashchange_handler = {};

  // set debug mode to false by default.
  hashchange_handler.debug = false;


  // default configs: here we can set prebuilt object lookups for the type of flows or pages.
  hashchange_handler.defaults = {
    "login": {
      "page_type": "Mobile",
      "page_class": "Log In or One-Time Access",
      "page_name": "login",
      "page_title": "Log In or One-Time Access",
      "page_title_sub": "Log In"
    },
    "#otaaccount/carefera/enroll/": {
      "page_type": "Mobile",
      "page_class": "CARE-FERA Enrollment",
      "page_name": "otaaccount/carefera/enroll",
      "page_title": "CARE/FERA",
      "page_title_sub": "Enroll in CARE/FERA"
    },
    "#otaaccount/carefera/thankyou": {
      "page_type": "Mobile",
      "page_class": "CARE-FERA Thank You",
      "page_name": "otaaccount/carefera/thankyou",
      "page_title": "CARE/FERA",
      "page_title_sub": "CARE/FERA Thank You"
    },
    "#myaccount/carefera/enroll/": {
      "page_type": "Mobile",
      "page_class": "CARE-FERA Enrollment",
      "page_name": "myaccount/carefera/enroll",
      "page_title": "CARE/FERA",
      "page_title_sub": "Enroll in CARE/FERA"
    }
  };

  hashchange_handler.parseURI = function(str) {
    var o = {
      strictMode: false,
      key: ["src", "protocol", "auth", "userInfo", "user", "pass", "host", "port", "relative", "path", "directory", "file", "query", "anchor"],
      q: {
        name: "query_key",
        parser: /(?:^|&)([^&=]*)=?([^&]*)/g
      },
      parser: {
        strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
        loose: /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
      }
    },
    m = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
    uri = {},
    i = 14;
    while (i--) uri[o.key[i]] = m[i] || "";
    uri[o.q.name] = {};
    uri[o.key[12]].replace(o.q.parser, function($0, $1, $2) {
      if ($1) uri[o.q.name][$1] = $2
    });
    return uri
  };

  // FUNCTION udo_builder: builds data passed into utag.view call.
  // EXAMPLES:
  //    hashchange_handler.udo_builder('thankyou')
  //          {dom.url: "https://www.pge.com/en_US/residential/save-energy-…onger-term-assistance/care/care.page#hash", event_type: "confirmation"};
  //    hashchange_handler.udo_builder({some_key: 'yey'})
  //          {dom.url: "https://www.pge.com/en_US/residential/save-energy-…onger-term-assistance/care/care.page#hash", some_key: "yey"};
  //    hashchange_handler.udo_builder({some_key: 'yey'}, {more_data: 'super'})
  //          { "dom.url": "https://www.pge.com/en_US/residential/save-energy-money/help-paying-your-bill/longer-term-assistance/care/care.page#hash", "some_key": "yey", "more_data": "super" }
  hashchange_handler.udo_builder = function(init, additional) {
    // FUNCTION kindof: returns the type of data correctly.
    function kindof(data) {
      var data_type = Object.prototype.toString.call(data).match(/\s([a-zA-Z]+)/)[1].toLowerCase().replace(/^html|element/gim, "");
      switch (data_type) {
        case "number":
        return isNaN(data) ? "nan" : "number";
        default:
        return data_type
      }
    };

    // FUNCTION map_data: takes keys from source and puts them in target.
    // EXAMPLES:
    //  map_data({key:'new value, override old'}, {key: 'old value, ill be wiped out'})
    //      {key: "new value, override old"}
    //  map_data({key:'new value!'}, {key: 'old value!', other_key: 'ill be fine'})
    //      {key: "new value!", other_key: "ill be fine"}

    function map_data(source, target) {
      source = kindof(source) === "object" ? source : {};
      target = kindof(target) === "object" ? target : {};
      if (Object.keys) {
        Object.keys(source).forEach(function(key, i) {
          target[key] = source[key]
        })
      } else {
        for (var key in source) {
          if (source.hasOwnProperty(key)) {
            target[key] = source[key]
          }
        }
      }
      return target
    }

    // create data object that is going to be passed into utag.view call.
    // always add the current page's url to the default dataset.
    var udo = {
      'dom.url': document.URL
    };

    // make a shortcut to the hashchange_handler config.
    var config = hashchange_handler.defaults || {};
    var init_type = kindof(init);

    // if the initial param is a string then lookit up in the default configs.
    // and great if we have it then map the keys to the udo we'll return eventually for the utag.view call.
    if (init_type === "string" && config[init]) {
      map_data(config[init], udo)
    } else if (init_type === "object") {
      map_data(init, udo);
    }

    // if we passed in additional data, map that too.
    if (kindof(additional) === "object") {
      map_data(additional, udo)
    }
    return udo;
  }

  //////////////////////////////////////
  // DISPATCH: Make the tracking call //
  //////////////////////////////////////
  // this handles firing the utag.view call based on the flow.
  hashchange_handler.queue = [];
  hashchange_handler.dispatch = function(event) {
    debugger;
    var self = hashchange_handler;
    if (self.queue.indexOf(event.oldURL) > -1 || self.queue.indexOf(document.URL) > -1) {
      return;
    };
    self.queue.push(event.oldURL);
    self.queue.push(document.URL);
    // exit if something happened and we lost the utag obj.
    if (!window.utag && !window.utag.view) {
      return;
    }



    ////////////////////////////////////////
    // GARBAGE COLLECT: CLEAN UP OLD TAGS //
    ////////////////////////////////////////
    // clean up old tags on the page while we ajax flow. optional but
    // probably a good idea.
    if (window.document.querySelectorAll) {
      Array.prototype.forEach.call(document.querySelectorAll('[id*="utag_"]'), function(tag) {
        // if we're in dev mode. tell me what is happening.
        if (self.debug && utag.DB) {
          utag.DB('removing old tags');
        }
        // clean up old tags before i fire utag.view again.
        tag.parentNode.removeChild(tag);
      });
    }

    ////////////////////////////////////
    // HERE WE ADD OUR LIST OF FLOWS //
    ////////////////////////////////////
    var tracking_data = {};
    var curr_path = self.parseURI(document.URL).path;
    var ref_path = self.parseURI(document.referrer).path;
    // #OTAACCOUNT/CAREFERA/CONFIRMATION
    if (event.oldURL === "https://m.pge.com/#otaaccount/carefera/confirmation" && event.newURL === "https://m.pge.com/#otaaccount/carefera/thankyou") {
      try {
        tracking_data = self.udo_builder("#otaaccount/carefera/thankyou");
        tracking_data = self.udo_builder(tracking_data);
        utag.view(tracking_data);
      } catch (e) {}
    }


    if (curr_path === "/en_US/residential/save-energy-money/resources/energy-alerts/energy-alerts.page" && ref_path === "/en_US/residential/save-energy-money/resources/summer-tips/summer-tips.page") {
      try {
        tracking_data = self.udo_builder("login");
        tracking_data = self.udo_builder(tracking_data);
        utag.view(tracking_data);
      } catch (e) {}
    }

    // test flow
    if (self.debug) {
      tracking_data = {};
      console.log('debug mode: firing utag.view');
      if (self.debug_data) tracking_data = self.udo_builder(self.debug_data, tracking_data);
      utag.view(tracking_data, function() {
        hashchange_handler.debug = false;
      });
    }
  }


  ////////////////////////////////
  // FINALLY: Attach the event. //
  ////////////////////////////////
  hashchange_handler.debug = true;
  if (hashchange_handler.queue.indexOf(document.URL) === -1) {
    window.addEventListener('hashchange', hashchange_handler.dispatch);
  }

} catch (e) {
  // statements
  console.log(e);
}
