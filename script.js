const maxTimeDifference = 2;

var resourceName = 'pmms';
var isRDR = true;
var audioVisualizations = {};
var currentServerEndpoint = '127.0.0.1:30120';

function sendMessage(name, params) {
	return fetch(`https://${resourceName}/${name}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(params)
	});
}

function applyPhonographFilter(player) {
	var context = new (window.AudioContext || window.webkitAudioContext)();

	var source;

	if (player.youTubeApi) {
		var html5Player = player.youTubeApi.getIframe().contentWindow.document.querySelector('.html5-main-video');

		source = context.createMediaElementSource(html5Player);
	} else if (player.hlsPlayer) {
		source = context.createMediaElementSource(player.hlsPlayer.media);
	} else if (player.originalNode) {
		source = context.createMediaElementSource(player.originalNode);
	} else {
		source = context.createMediaElementSource(player);
	}

	if (source) {
		var splitter = context.createChannelSplitter(2);
		var merger = context.createChannelMerger(2);

		var gainNode = context.createGain();
		gainNode.gain.value = 0.5;

		var lowpass = context.createBiquadFilter();
		lowpass.type = 'lowpass';
		lowpass.frequency.value = 3000;
		lowpass.gain.value = -1;

		var highpass = context.createBiquadFilter();
		highpass.type = 'highpass';
		highpass.frequency.value = 300;
		highpass.gain.value = -1;

		source.connect(splitter);
		splitter.connect(merger, 0, 0);
		splitter.connect(merger, 1, 0);
		splitter.connect(merger, 0, 1);
		splitter.connect(merger, 1, 1);
		merger.connect(gainNode);
		gainNode.connect(lowpass);
		lowpass.connect(highpass);
		highpass.connect(context.destination);
	}

	var noise = document.createElement('audio');
	noise.id = player.id + '_noise';
	noise.src = 'https://redm.khzae.net/phonograph/noise.webm';
	noise.volume = 0;
	document.body.appendChild(noise);
	noise.play();

	player.style.filter = 'sepia()';

	player.addEventListener('play', event => {
		noise.play();
	});
	player.addEventListener('pause', event => {
		noise.pause();
	});
	player.addEventListener('volumechange', event => {
		noise.volume = player.volume;
	});
	player.addEventListener('seeked', event => {
		noise.currentTime = player.currentTime;
	});
}

function applyRadioFilter(player) {
	var context = new (window.AudioContext || window.webkitAudioContext)();

	var source;

	if (player.youTubeApi) {
		var html5Player = player.youTubeApi.getIframe().contentWindow.document.querySelector('.html5-main-video');

		source = context.createMediaElementSource(html5Player);
	} else if (player.hlsPlayer) {
		source = context.createMediaElementSource(player.hlsPlayer.media);
	} else if (player.originalNode) {
		source = context.createMediaElementSource(player.originalNode);
	} else {
		source = context.createMediaElementSource(player);
	}

	if (source) {
		var splitter = context.createChannelSplitter(2);
		var merger = context.createChannelMerger(2);

		var gainNode = context.createGain();
		gainNode.gain.value = 0.5;

		var lowpass = context.createBiquadFilter();
		lowpass.type = 'lowpass';
		lowpass.frequency.value = 5000;
		lowpass.gain.value = -1;

		var highpass = context.createBiquadFilter();
		highpass.type = 'highpass';
		highpass.frequency.value = 200;
		highpass.gain.value = -1;

		source.connect(splitter);
		splitter.connect(merger, 0, 0);
		splitter.connect(merger, 1, 0);
		splitter.connect(merger, 0, 1);
		splitter.connect(merger, 1, 1);
		merger.connect(gainNode);
		gainNode.connect(lowpass);
		lowpass.connect(highpass);
		highpass.connect(context.destination);
	}
}

function createAudioVisualization(player, visualization) {
	var waveCanvas = document.createElement('canvas');
	waveCanvas.id = player.id + '_visualization';
	waveCanvas.style.position = 'absolute';
	waveCanvas.style.top = '0';
	waveCanvas.style.left = '0';
	waveCanvas.style.width = '100%';
	waveCanvas.style.height = '100%';

	player.appendChild(waveCanvas);

	var html5Player;

	if (player.youTubeApi) {
		html5Player = player.youTubeApi.getIframe().contentWindow.document.querySelector('.html5-main-video');
	} else if (player.hlsPlayer) {
		html5Player = player.hlsPlayer.media;
	} else if (player.originalNode) {
		html5Player = player.originalNode;
	} else {
		html5Player = player;
	}

	if (!html5Player.id) {
		html5Player.id = player.id + '_html5Player';
	}

	html5Player.style.visibility = 'hidden';

	var doc = player.youTubeApi ? player.youTubeApi.getIframe().contentWindow.document : document;

	if (player.youTubeApi) {
		player.youTubeApi.getIframe().style.visibility = 'hidden';
	}

	var wave = new Wave();

	var options;

	if (visualization) {
		options = audioVisualizations[visualization] || {};

		if (options.type == undefined) {
			options.type = visualization;
		}
	} else {
		options = { type: 'cubes' }
	}

	options.skipUserEventsWatcher = true;
	options.elementDoc = doc;

	wave.fromElement(html5Player.id, waveCanvas.id, options);
}

function showLoadingIcon() {
	document.getElementById('loading').style.display = 'block';
}

function hideLoadingIcon() {
	document.getElementById('loading').style.display = 'none';
}

function extractYouTubeId(url) {
	var videoId = null;

	// Format youtube.com/watch?v=ID
	if (url.includes('youtube.com/watch')) {
		var match = url.match(/[?&]v=([^&]+)/);
		if (match) videoId = match[1];
	}
	// Format youtu.be/ID
	else if (url.includes('youtu.be/')) {
		var match = url.match(/youtu\.be\/([^?&]+)/);
		if (match) videoId = match[1];
	}
	// Format youtube.com/embed/ID
	else if (url.includes('youtube.com/embed/')) {
		var match = url.match(/embed\/([^?&]+)/);
		if (match) videoId = match[1];
	}

	return videoId;
}

async function getYouTubeDirectUrl(videoId) {
	// Instances Invidious à essayer
	var instances = [
		'https://invidious.private.coffee',
		'https://yt.artemislena.eu',
		'https://invidious.fdn.fr',
		'https://inv.nadeko.net'
	];

	// Essayer chaque instance jusqu'à ce qu'une fonctionne
	for (var i = 0; i < instances.length; i++) {
		try {
			var apiUrl = instances[i] + '/api/v1/videos/' + videoId;
			var response = await fetch(apiUrl);

			if (response.ok) {
				var data = await response.json();

				// Chercher le meilleur format disponible (720p ou 480p)
				if (data.adaptiveFormats && data.adaptiveFormats.length > 0) {
					// Filtrer pour avoir vidéo + audio combinés
					var formats = data.formatStreams || [];

					// Prendre le format 720p (itag 22) ou 360p (itag 18)
					for (var j = 0; j < formats.length; j++) {
						if (formats[j].qualityLabel === '720p' || formats[j].qualityLabel === '360p') {
							return formats[j].url;
						}
					}

					// Sinon prendre le premier format disponible
					if (formats.length > 0) {
						return formats[0].url;
					}
				}
			}
		} catch (error) {
			console.log('Instance ' + instances[i] + ' failed, trying next...');
			continue;
		}
	}

	// Si toutes les instances échouent, retourner null
	return null;
}

function convertYouTubeUrl(url) {
	var videoId = extractYouTubeId(url);

	if (videoId) {
		// Marquer cette URL comme étant YouTube pour traitement spécial
		return 'YOUTUBE:' + videoId;
	}

	return url;
}

function resolveUrl(url) {
	if (url.startsWith('http://') || url.startsWith('https://')) {
		// Convertir les liens YouTube au format embed optimisé
		if (url.includes('youtube.com') || url.includes('youtu.be')) {
			return convertYouTubeUrl(url);
		}
		return url;
	} else {
		return 'http://' + currentServerEndpoint + '/pmms/media/' + url;
	}
}

async function initPlayer(id, handle, options) {
	var resolvedUrl = resolveUrl(options.url);

	// Si c'est une vidéo YouTube, récupérer l'URL directe
	if (resolvedUrl.startsWith('YOUTUBE:')) {
		var videoId = resolvedUrl.replace('YOUTUBE:', '');
		var directUrl = await getYouTubeDirectUrl(videoId);

		if (directUrl) {
			resolvedUrl = directUrl;
		} else {
			// Fallback sur YouTube embed si Invidious échoue
			resolvedUrl = 'https://www.youtube.com/embed/' + videoId + '?autoplay=1';
		}
	}

	var player = document.createElement('video');
	player.id = id;
	player.src = resolvedUrl;
	document.body.appendChild(player);

	if (options.attenuation == null) {
		options.attenuation = { sameRoom: 0, diffRoom: 0 };
	}

	new MediaElement(id, {
		error: function (media) {
			hideLoadingIcon();

			sendMessage('initError', {
				url: options.url,
				message: media.error.message
			});

			media.remove();
		},
		success: function (media, domNode) {
			media.className = 'player';

			media.pmms = {};
			media.pmms.initialized = false;
			media.pmms.attenuationFactor = options.attenuation.diffRoom;
			media.pmms.volumeFactor = options.diffRoomVolume;

			media.volume = 0;

			media.addEventListener('error', event => {
				hideLoadingIcon();

				sendMessage('playError', {
					url: options.url,
					message: media.error.message
				});

				if (!media.pmms.initialized) {
					media.remove();
				}
			});

			media.addEventListener('canplay', () => {
				if (media.pmms.initialized) {
					return;
				}

				hideLoadingIcon();

				var duration;

				if (media.duration == NaN || media.duration == Infinity || media.duration == 0 || media.hlsPlayer) {
					options.offset = 0;
					options.duration = false;
					options.loop = false;
				} else {
					options.duration = media.duration;
				}

				if (media.youTubeApi) {
					options.title = media.youTubeApi.getVideoData().title;

					media.videoTracks = { length: 1 };
				} else if (media.hlsPlayer) {
					media.videoTracks = media.hlsPlayer.videoTracks;
				} else if (media.twitchPlayer) {
					/* Auto-click Twitch mature content warning button. */
					let button = media.twitchPlayer._iframe.contentWindow.document.querySelector('button[data-a-target="player-overlay-mature-accept"]');

					if (button) {
						button.click();
					}
				} else {
					media.videoTracks = media.originalNode.videoTracks;
				}

				options.video = true;
				options.videoSize = 0;

				sendMessage('init', {
					handle: handle,
					options: options
				});

				media.pmms.initialized = true;

				media.play();
			});

			media.addEventListener('playing', () => {
				if (options.filter && !media.pmms.filterAdded) {
					if (isRDR) {
						applyPhonographFilter(media);
					} else {
						applyRadioFilter(media);
					}
					media.pmms.filterAdded = true;
				}

				if (options.visualization && !media.pmms.visualizationAdded) {
					createAudioVisualization(media, options.visualization);
					media.pmms.visualizationAdded = true;
				}
			});

			media.play();
		}
	});
}

async function getPlayer(handle, options) {
	if (handle == undefined) {
		return;
	}

	var id = 'player_' + handle.toString();

	var player = document.getElementById(id);

	if (!player && options && options.url) {
		player = await initPlayer(id, handle, options);
	}

	return player;
}

function parseTimecode(timecode) {
	if (typeof timecode != "string") {
		return timecode;
	} else if (timecode.includes(':')) {
		var a = timecode.split(':');
		return parseInt(a[0]) * 3600 + parseInt(a[1]) * 60 + parseInt(a[2]);
	} else {
		return parseInt(timecode);
	}
}

async function init(data) {
	if (data.url == '') {
		return;
	}

	showLoadingIcon();

	data.options.offset = parseTimecode(data.options.offset);

	if (!data.options.title) {
		data.options.title = data.options.url;
	}

	await getPlayer(data.handle, data.options);
}

function play(handle) {
	var player = getPlayer(handle);
}

function stop(handle) {
	var player = getPlayer(handle);

	if (player) {
		var noise = document.getElementById(player.id + '_noise');
		if (noise) {
			noise.remove();
		}

		player.remove();
	}
}

function setAttenuationFactor(player, target) {
	if (player.pmms.attenuationFactor > target) {
		player.pmms.attenuationFactor -= 0.1;
	} else {
		player.pmms.attenuationFactor += 0.1;
	}
}

function setVolumeFactor(player, target) {
	if (player.pmms.volumeFactor > target) {
		player.pmms.volumeFactor -= 0.01;
	} else {
		player.pmms.volumeFactor += 0.01;
	}
}

function setVolume(player, target) {
	if (Math.abs(player.volume - target) > 0.1) {
		if (player.volume > target) {
			player.volume -= 0.05;
		} else {
			player.volume += 0.05;
		}
	}
}

function update(data) {
	var player = getPlayer(data.handle, data.options);

	if (player) {
		if (data.options.paused || data.distance < 0 || data.distance > data.options.range) {
			if (!player.paused) {
				player.pause();
			}
		} else {
			if (data.sameRoom) {
				setAttenuationFactor(player, data.options.attenuation.sameRoom);
				setVolumeFactor(player, 1.0);
			} else {
				setAttenuationFactor(player, data.options.attenuation.diffRoom);
				setVolumeFactor(player, data.options.diffRoomVolume);
			}

			if (player.readyState > 0) {
				var volume;

				if (data.options.muted || data.volume == 0) {
					volume = 0;
				} else {
					volume = (((100 - data.distance * player.pmms.attenuationFactor) / 100) * player.pmms.volumeFactor) * (data.volume / 100);
				}

				if (volume > 0) {
					if (data.distance > 100) {
						setVolume(player, volume);
					} else {
						player.volume = volume;
					}
				} else {
					player.volume = 0;
				}

				if (data.options.duration) {
					var currentTime = data.options.offset % player.duration;

					if (Math.abs(currentTime - player.currentTime) > maxTimeDifference) {
						player.currentTime = currentTime;
					}
				}

				if (player.paused) {
					player.play();
				}
			}
		}
	}
}

function setResourceNameFromUrl() {
	var url = new URL(window.location);
	var params = new URLSearchParams(url.search);
	resourceName = params.get('resourceName') || resourceName;
}

window.addEventListener('message', event => {
	switch (event.data.type) {
		case 'init':
			init(event.data);
			break;
		case 'play':
			play(event.data.handle);
			break;
		case 'stop':
			stop(event.data.handle);
			break;
		case 'update':
			update(event.data);
			break;
		case 'DuiBrowser:init':
			sendMessage('DuiBrowser:initDone', { handle: event.data.handle });
			break;
	}
});

window.addEventListener('load', () => {
	setResourceNameFromUrl();

	sendMessage('duiStartup', {}).then(resp => resp.json()).then(resp => {
		if (resp.isRDR != undefined) {
			isRDR = resp.isRDR;
		}
		if (resp.audioVisualizations != undefined) {
			audioVisualizations = resp.audioVisualizations;
		}
		if (resp.currentServerEndpoint != undefined) {
			currentServerEndpoint = resp.currentServerEndpoint;
		}
	});
});
