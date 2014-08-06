/*
	tracking javascript errors

		qwx.errtrack.notify		: упрощённое - кладёт сообщение об ошибках в очередь отправки
		qwx.errtrack.pushEvent	: полное - кладёт сообщение об ошибках в очередь отправки
		qwx.errtrack.on			: включает трекинг (включен по умолчанию)

		qwx.errtrack._bind_window_events	: навешивает обработчики событий для отлова ошибок
		qwx.errtrack._watch					: каждые 10 секунд посылает на сервер информацию об ошибках
		qwx.errtrack._renew					: стирает отправленную информацию

*/
(function() {
	var root = this;
	
	/*
		коллекция произошедших событий
	*/
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
	
	
	errtrack._renew = function(){
		clientInfo.events = [];
		clientInfo.lastNotified = (new Date()).toString();
	};

	// store onerror into clientInfo.events
	errtrack._bind_window_events = function() {
		if (typeof(root.onerror) != "undefined") {
			root.onerror = function (msg, url, line) {
				if (url && url.indexOf('chrome://') != 0) {
					errtrack.pushEvent('error', {
						'message'	: msg,
						'url'		: url,
						'doc'		: root.location.toString(),
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
					'doc'			: root.location.toString()
				});
			}
		});
	};
	
	// every 10sec (default) send clientInfo.events to server (if exists)
	errtrack._watch = function(opts){
		if (clientInfo.timer) {
			return;
		}

		!opts	&& (opts = {});
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
				$.ajax({
					'type'		: 'POST',
					'global'	: false,
					'dataType'	: 'json',
					'url'		: opts.path || '/errtrack',
					'data'		: {
						'cookie'	: document.cookie,
						'browser'	: root.navigator.userAgent,
						'events'	: JSON.stringify(clientInfo.events, null, 4)
					}
				})
				.done(function(data){
					if (data.ok) {
						errtrack._renew(clientInfo.events);
					}
				})
				.always(function () {
					clientInfo.timer = setTimeout(notifier, interval);
				});
			} else {
				clientInfo.timer = setTimeout(notifier, interval);
			}
		};

		notifier();
	};
	
	errtrack.on = function(opts){
		errtrack._bind_window_events(opts);
		errtrack._watch(opts);
	};
	
}).call(this);

$(document).ready(function(){
	errtrack.on();
});
