/*
	errtrack.notify				:
	errtrack.pushEvent			:
	errtrack.bind_window_events	:
	errtrack.watch				:
	errtrack.on					:
*/
(function() {
	var root = this;	

	var clientInfo = {
		'timer'			: null,
		'events'		: [],
		'lastNotified'	: (new Date()).toString()
	};

	var errtrack = function(obj) {
		if (obj instanceof _) return obj;
		if (!(this instanceof _)) return new _(obj);
		this._wrapped = obj;
	};
	
	root.errtrack = errtrack;
	
	errtrack.pushEvent = function(type, data) {
		clientInfo.events.push({
			'date'		: (new Date()).toString(),
			'online'	: (navigator.onLine ? 1 : 0),
			'type'		: type,
			'data'		: data
		});
	};
	errtrack.notify = function() {
		var type = 'error', str;
		if (arguments.length > 0) {
			type = arguments[0];
			str = arguments[1];
		} else {
			str = arguments[0];
		}
		if (!str) {
			return;
		}
		return errtrack.pushEvent(type, str);
	};
	
	
	errtrack.renew = function(){
		clientInfo.events = [];
		clientInfo.lastNotified = (new Date()).toString();
	};
	
	// store onerror into clientInfo.events
	errtrack.bind_window_events = function() {

		if (typeof(window.onerror) != "undefined") {
			window.onerror = function (msg, url, line) {
				if (url && url.indexOf('chrome://') != 0) {
					errtrack.pushEvent('error', {
						'message'	: msg,
						'url'		: url,
						'doc'		: window.location.toString(),
						'line'		: line
					});
				}
			};
		}
		$(document).ajaxError(function(event, jqXHR, ajaxSettings, thrownError){
			if (jqXHR.statusText != 'abort') {
				errtrack.pushEvent('ajax-error', {
					'message'		: thrownError ? thrownError.toString() : null,
					'url'			: ajaxSettings.url,
					'data'			: ajaxSettings.data,
					'type'			: ajaxSettings.type,
					'dataType'		: ajaxSettings.dataType,
					'status'		: jqXHR.status,
					'statusText'	: jqXHR.statusText,
					'doc'			: window.location.toString()
				});
			}
		});
	};
	
	// every 10sec (default) send clientInfo.events to server (if exists)
	errtrack.watch = function(opts){
		if (clientInfo.timer) {
			return;
		}
		opts = opts || {};

		interval = opts.interval || 10000;

		var notifier;
		notifier = function () {
			/*	if errors:
					send data:
						success ? clean data
						error: pass
					both: set timeout for next action
				unless errors:
					set timeout for next action
			*/
			if (clientInfo.events.length) {
				$.post(opts.path || '/errtrack',
					{
						'cookie'	: document.cookie,
						'browser'	: window.navigator.userAgent,
						'events'	: JSON.stringify(clientInfo.events, null, 4)
					},
					function(data) {
						if (data.ok) {
							errtrack.renew();
						}
					},
					'json'
				).always(function () {
					clientInfo.timer = setTimeout(notifier, interval);
				});
			} else {
				clientInfo.timer = setTimeout(notifier, interval);
			}
		};

		notifier();
	};
	
	errtrack.on = function(opts){
		errtrack.bind_window_events();
		errtrack.watch(opts);
	};
	
}).call(this);

$(document).ready(function(){
	errtrack.on();
});
