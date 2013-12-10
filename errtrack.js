$(document).ready(function(){
	// store onerror into qwx.clientInfo.events
	bindWindowEvents();

	// and every 10sec (default) send qwx.clientInfo.events to server (if exists)
	startWindowEventsWatcher();

	//
	function getClientInfo() {
		if (!window.qwx || !window.qwx.clientInfo) {
			if (!window.qwx) {
				window.qwx = {};
			}
			window.qwx.clientInfo = {
				'timer'			: null,
				'events'		: [],
				'lastNotified'	: (new Date()).toString()
			};
		}
		return window.qwx.clientInfo;
	}
	function saveClientEvent(type, data) {
		getClientInfo().events.push({
			'type'	: type,
			'date'	: (new Date()).toString(),
			'data'	: data
		});
	}
	function bindWindowEvents() {
		if (typeof(window.onerror) != "undefined") {
			window.onerror = function (msg, url, line) {
				if (url && url.indexOf('chrome://') != 0) {
					saveClientEvent('error', {  
						'message'	: msg,
						'url'		: url,
						'doc'		: window.location.toString(),
						'line'		: line
					});
				}
			};
		}
		$(document).ajaxError(function(event, jqXHR, ajaxSettings, thrownError){
			saveClientEvent('ajax-error', {  
				'message'		: thrownError ? thrownError.toString() : null,
				'url'			: ajaxSettings.url,
				'data'			: ajaxSettings.data,
				'type'			: ajaxSettings.type,
				'dataType'		: ajaxSettings.dataType,
				'status'		: jqXHR.status,
				'statusText'	: jqXHR.statusText,
				'doc'			: window.location.toString()
			});
		});
	}
	function startWindowEventsWatcher(interval) {
		interval = interval || 10000;

		var notifer;
		if (getClientInfo().timer) {
			return;
		}

		notifier = function () {
			/*	if errors:
					send data:
						success ? clean data
						error: pass
					both: set timeout for next action
				unless errors:
					set timeout for next action
			*/
			if (getClientInfo().events.length) {
				$.post('/errtrack',
					{
						'cookie'	: document.cookie,
						'browser'	: window.navigator.userAgent,
						'events'	: JSON.stringify(getClientInfo().events, null, 4)
					},
					function(data) {
						if (data.ok) {
							var ci = getClientInfo();
							ci.events = [];
							ci.lastNotified = (new Date()).toString();
						} else {
							//	?
						}
					},
					'json'
				).fail(function(){
					//	?
				}).always(function () {
					getClientInfo().timer = setTimeout(notifier, interval);
                });
			} else {
				getClientInfo().timer = setTimeout(notifier, interval);
			}
		};   

		notifier();
	}
});
