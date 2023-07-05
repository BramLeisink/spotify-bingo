var accessToken = null;
var isTracking = false;
var trackedSongs = [];

function getHashParams() {
  var hashParams = {};
  var e, r = /([^&;=]+)=?([^&;]*)/g,
    q = window.location.hash.substring(1);
  while (e = r.exec(q)) {
    hashParams[e[1]] = decodeURIComponent(e[2]);
  }
  return hashParams;
}

function loginWithSpotify() {
  var client_id = '524426dd0758495eb183b9073bea7ff4';
  var redirect_uri = 'https://bramleisink.github.io/spotify-bingo/login.html';
  // var redirect_uri = 'http://127.0.0.1:5500/login.html';

  var url = 'https://accounts.spotify.com/authorize';
  url += '?response_type=token';
  url += '&client_id=' + encodeURIComponent(client_id);
  url += '&redirect_uri=' + encodeURIComponent(redirect_uri);
  url += '&scope=user-read-private user-read-currently-playing';
  url += '&state=' + encodeURIComponent(Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));

  window.location.href = url;
}

function logout() {
  accessToken = null;
  isTracking = false;
  trackedSongs = [];
  var loginButton = document.getElementById('login-button');
  loginButton.textContent = 'Log in with Spotify';
  enableTrackingButtons();
  clearCurrentlyPlaying();
  displayTrackedSongs();
}

function enableTrackingButtons() {
  var trackButton = document.getElementById('track-button');
  var stopButton = document.getElementById('stop-button');

  if (accessToken) {
    trackButton.style.display = 'inline-block';
    stopButton.style.display = 'inline-block';
    trackButton.disabled = isTracking;
    stopButton.disabled = !isTracking;
  } else {
    trackButton.style.display = 'none';
    stopButton.style.display = 'none';
  }
}

function startTracking() {
  isTracking = true;
  enableTrackingButtons();
  var startTime = new Date().toLocaleTimeString();
  localStorage.setItem('startTrackingTime', startTime);
}

function stopTracking() {
  isTracking = false;
  enableTrackingButtons();
  clearCurrentlyPlaying();
  trackedSongs = [];
  displayTrackedSongs();
  localStorage.removeItem('startTrackingTime');
}

function clearCurrentlyPlaying() {
  var albumCover = document.getElementById('album-cover');
  var songName = document.getElementById('song-name');
  var artistName = document.getElementById('artist-name');

  albumCover.src = '';
  songName.textContent = '';
  artistName.textContent = '';
}

function displayTrackedSongs() {
  var songsList = document.getElementById('songs-list');
  songsList.innerHTML = '';

  if (trackedSongs.length === 0) {
    songsList.textContent = 'No tracked songs.';
  } else {
    trackedSongs.forEach(function(song) {
      var li = document.createElement('li');
      li.innerHTML = `
        <img class="album-cover-small" src="${song.album.images[2].url}" alt="Album Cover">
        <div class="song-details-small">
          <p>${song.name}</p>
          <p>${song.artists[0].name}</p>
        </div>
      `;
      songsList.appendChild(li);
    });
  }
}

function displayUserInfo() {
  accessToken = localStorage.getItem('accessToken');

  if (accessToken) {
    var headers = {
      'Authorization': 'Bearer ' + accessToken
    };

    fetch('https://api.spotify.com/v1/me', { headers: headers })
      .then(function(response) {
        return response.json();
      })
      .then(function(data) {
        var displayName = data.display_name;
        var loginButton = document.getElementById('login-button');

        if (displayName) {
          loginButton.textContent = 'Logged in as: ' + displayName;
        } else {
          loginButton.textContent = 'Logged in';
        }

        enableTrackingButtons();
      })
      .finally(function() {
        fetchCurrentlyPlayingSong();
      });
  } else {
    enableTrackingButtons();
  }

  var startTrackingTime = localStorage.getItem('startTrackingTime');
  if (startTrackingTime) {
    console.log('Start tracking time:', startTrackingTime);
    console.log('Access token:', accessToken);
    isTracking = true;
    enableTrackingButtons();
  }
}

function fetchCurrentlyPlayingSong() {
  if (!accessToken) {
    clearCurrentlyPlaying();
    return;
  }

  var headers = {
    'Authorization': 'Bearer ' + accessToken
  };

  fetch('https://api.spotify.com/v1/me/player/currently-playing', { headers: headers })
    .then(function(response) {
      return response.json();
    })
    .then(function(data) {
      var currentlyPlaying = data.item;

      if (currentlyPlaying) {
        var albumCover = document.getElementById('album-cover');
        var songName = document.getElementById('song-name');
        var artistName = document.getElementById('artist-name');

        albumCover.src = currentlyPlaying.album.images[0].url;
        songName.textContent = currentlyPlaying.name;
        artistName.textContent = currentlyPlaying.artists[0].name;

        if (isTracking) {
          var isDuplicate = trackedSongs.some(function(song) {
            return song.id === currentlyPlaying.id;
          });

          if (!isDuplicate) {
            trackedSongs.push(currentlyPlaying);
            displayTrackedSongs();
          }
        }
      } else {
        clearCurrentlyPlaying();
      }
    })
    .finally(function() {
      setTimeout(fetchCurrentlyPlayingSong, 3000);
    });
}

document.getElementById('login-button').addEventListener('click', function() {
  if (accessToken) {
    if (confirm('Are you sure you want to log out?')) {
      localStorage.removeItem('accessToken'); // Remove access token from cache on logout
      logout();
    }
  } else {
    loginWithSpotify();
  }
});

document.getElementById('track-button').addEventListener('click', startTracking);
document.getElementById('stop-button').addEventListener('click', stopTracking);

window.addEventListener('load', displayUserInfo);