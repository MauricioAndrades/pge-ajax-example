// hashchange polyfill: adds ability to detect hashchange on browsers that do not have the event.
(function(){
  // exit if the browser implements that event
  if("onhashchange"in window){return}
  var location=window.location,oldURL=location.href,oldHash=location.hash;
  // check the location hash on a 100ms interval
  setInterval(function() {
    var newURL=location.href,newHash=location.hash;
    // if the hash has changed and a handler has been bound...
    if(newHash!=oldHash&&typeof window.onhashchange==="function") {
      // execute the handler
      window.onhashchange({type:"hashchange",oldURL:oldURL,newURL:newURL});
      oldURL=newURL;
      oldHash=newHash
    }
  }, 500);
})();

window.hash_changed = {};
hash_changed.config = {'thankyou': {"event_type": "confirmation"}};

// function udo_builder: builds data passed into utag.view call.
// examples:
//    hash_changed.udo_builder('thankyou') === {dom.url: "https://www.pge.com/en_US/residential/save-energy-…onger-term-assistance/care/care.page#hash", event_type: "confirmation"};
//    hash_changed.udo_builder({some_key: 'yey'}) === {dom.url: "https://www.pge.com/en_US/residential/save-energy-…onger-term-assistance/care/care.page#hash", some_key: "yey"};
//    hash_changed.udo_builder({some_key: 'yey'}, {more_data: 'super'}) === { "dom.url": "https://www.pge.com/en_US/residential/save-energy-money/help-paying-your-bill/longer-term-assistance/care/care.page#hash", "some_key": "yey", "more_data": "super" }
hash_changed.udo_builder = function(init, additional) {
  // function kindof: returns the type of data correctly.
  function kindof(data){var data_type=Object.prototype.toString.call(data).match(/\s([a-zA-Z]+)/)[1].toLowerCase().replace(/^html|element/gim,"");switch(data_type){case"number":return isNaN(data)?"nan":"number";default:return data_type}};
  // function map_data: takes keys from source and puts them in target.
  function map_data(source,target){source=kindof(source)==="object"?source:{};target=kindof(target)==="object"?target:{};if(Object.keys){Object.keys(source).forEach(function(key,i){target[key]=source[key]})}else{for(var key in source){if(source.hasOwnProperty(key)){target[key]=source[key]}}}return target}
  // create data object that is going to be passed into utag.view call.
  // always add the current page's url to the default dataset.
  var udo = {'dom.url': document.URL};
  // make a shortcut to the hashchange_handler config.
  var config = hash_changed.config || {};
  var init_type = kindof(init);
  // if the initial param is a string then lookit up in the default configs.
  // and great if we have it then map the keys to the udo we'll return eventually for the utag.view call.
  if (init_type === "string" && config[init]) {map_data(config[init], udo)}
  else if (init_type === "object") {map_data(init, udo);}
  // if we passed in additional data, map that too.
  if (kindof(additional) === "object") {map_data(additional, udo)}
  return udo;
}

hash_changed.dispatch = function(event) {
  // exit if something happened and we lost the utag obj.
  if (!window.utag && !window.utag.view) {return;}

  // add debug mode: so you can see what is going on in your staging env.
  var debug = /dev\/utag\.js|\/qa\/utag\.js/.test(utag.cfg.path);

  // garbage collect: clean up old tags.
  if (window.document.querySelectorAll) {
    Array.prototype.forEach.call(document.querySelectorAll('[id*="utag"]'), function(tag) {
      if (/dev\/utag\.js|\/qa\/utag\.js/.test(utag.cfg.path)) tag.parentNode.removeChild(tag);
    });
  }

  // create the data passed into the utag.view call.
  if (event.oldURL === "https://m.pge.com/#otaaccount/carefera/confirmation" && event.newURL === "https://m.pge.com/#otaaccount/carefera/thankyou") {
    utag.view(hash_changed.udo_builder('thankyou'));
  }
}

window.addEventListener('hashchange', function(e) {
  hash_changed.dispatch(e);
});
