console.log("Lets write JavaScript");
let currentSong = new Audio();
let songs = [];
let currFolder;

function secondsToMinutesSeconds(seconds) {
  if (isNaN(seconds) || seconds < 0) {
    return "00:00";
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  const formattedMinutes = String(minutes).padStart(2, "0");
  const formattedSeconds = String(remainingSeconds).padStart(2, "0");
  return `${formattedMinutes}:${formattedSeconds}`;
}

function playMusic(path, pause = false) {
  console.log("Playing:", path);
  currentSong.src = path;
  if (!pause) {
    currentSong.play();
    play.src = "img/pause.svg";
  }
}

// Login Modal Functions
function openLoginModal() {
  const modal = document.getElementById('loginModal');
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLoginModal() {
  const modal = document.getElementById('loginModal');
  modal.classList.remove('active');
  document.body.style.overflow = 'auto';
}

function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  if (email && password) {
    alert(`Login attempt with email: ${email}`);
    closeLoginModal();
    // Here you would typically send the data to your server
    // For demo purposes, we'll just close the modal
  }
}

async function listSongsAndMP3Files() {
  try {
    const response = await fetch("/songs/");
    const html = await response.text();
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = html;
    const anchors = tempDiv.getElementsByTagName("a");
    const songsFound = [];

    for (let anchor of anchors) {
      let href = anchor.getAttribute("href");
      if (!href) continue;
      if (href.includes("..")) continue; // skip parent links

      console.log("Raw href:", href);

      // Normalize and decode
      let decoded = decodeURIComponent(href.trim());

      // Skip top-level /songs or /songs/
      if (/^\/?songs\/?$/i.test(decoded)) continue;

      // Extract folder name (remove leading '/songs/' or 'songs/' if present)
      let folderName;
      if (/\/songs\//i.test(decoded)) {
        folderName = decoded.split(/\/songs\//i).pop();
      } else if (/^songs\//i.test(decoded)) {
        folderName = decoded.replace(/^songs\//i, "");
      } else {
        folderName = decoded;
      }

      // Remove any trailing slash
      folderName = folderName.replace(/\/$/, "");

      // If this contains a dot (.) it's likely a file — skip it
      if (!folderName || folderName.includes(".")) continue;

      console.log("Folder:", folderName);

      // Build the fetch path to the folder index reliably
      const folderFetchPath = `/songs/${encodeURI(folderName)}/`;

      // Fetch folder contents
      const folderResp = await fetch(folderFetchPath);
      if (!folderResp.ok) {
        console.warn("Could not fetch folder:", folderFetchPath, "status:", folderResp.status);
        continue;
      }

      const folderHTML = await folderResp.text();
      const folderTemp = document.createElement("div");
      folderTemp.innerHTML = folderHTML;
      const fileAnchors = folderTemp.getElementsByTagName("a");

      for (let fAnchor of fileAnchors) {
        const fileHref = fAnchor.getAttribute("href");
        if (!fileHref) continue;

        // Only log/display .mp3 files
        if (fileHref.toLowerCase().endsWith(".mp3")) {
          const fileName = decodeURIComponent(fileHref.replace(/\/$/, ""));
          console.log("  MP3 File:", fileName);
          console.log("  fileHref:", fileHref);

          // Check if fileHref is already a full path or just filename
          let fullPath;
          if (fileHref.startsWith('/songs/') || fileHref.startsWith('songs/')) {
            // fileHref is already a full path
            fullPath = fileHref.startsWith('/') ? fileHref : '/' + fileHref;
          } else {
            // fileHref is just filename, build full path
            fullPath = `/songs/${folderName}/${fileHref}`;
          }

          console.log("  Final path:", fullPath);

          songsFound.push({
            folder: folderName,
            file: fileName,
            path: fullPath
          });
        }
      }
    }

    console.log("All found songs:", songsFound);
    return songsFound;
  } catch (err) {
    console.error("Error reading directory:", err);
    return [];
  }
}

async function main() {
  // Get the list of all the songs
  let songListUl = document.querySelector('.songList ul');

  songs = await listSongsAndMP3Files(); // make sure songs is loaded first
  songListUl.innerHTML = ""; // clear any existing

  songs.forEach((song, index) => {
    // Extract just the song name without extension
    let songName = song.file.replace(/\.mp3$/i, ''); // Remove .mp3 extension
    // Clean up the song name (remove hyphens, underscores, make it more readable)
    songName = songName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    songListUl.innerHTML += `
      <li data-song-path="${song.path}" data-song-index="${index}">
        <img class="invert" src="img/music.svg" alt="music icon" />
        <div class="info">
          <div>${songName}</div>
          <div>${song.folder.replace(/[()_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
        </div>
        <div class="playnow" data-song-path="${song.path}">
          <span>Play Now</span>
          <img class="invert" src="img/play.svg" alt="play icon" />
        </div>
      </li>`;
  });

  if (songs.length > 0) {
    playMusic(songs[0].path, true);
  }

  // Attach click to each sidebar play button
  document.querySelectorAll(".playnow").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent event bubbling
      let songPath = btn.getAttribute("data-song-path");
      console.log("Play button clicked, path:", songPath);
      playMusic(songPath);
      
      // Update song info display
      const songInfo = songs.find(s => s.path === songPath);
      if (songInfo) {
        const songInfoElement = document.querySelector(".songinfo");
        if (songInfoElement) {
          songInfoElement.textContent = songInfo.file.replace(/\.mp3$/i, '');
        }
      }
    });
  });

  // Attach click to song list items (clicking anywhere on the song item)
  document.querySelectorAll(".songList li").forEach((li) => {
    li.addEventListener("click", (e) => {
      // Don't trigger if clicking on the play button (it has its own handler)
      if (e.target.closest('.playnow')) return;
      
      const songPath = li.getAttribute("data-song-path");
      const songIndex = parseInt(li.getAttribute("data-song-index"));
      
      console.log("Song item clicked, path:", songPath);
      
      if (songPath && !isNaN(songIndex)) {
        playMusic(songPath);
        
        // Update song info display
        const songInfoElement = document.querySelector(".songinfo");
        if (songInfoElement) {
          songInfoElement.textContent = songs[songIndex].file.replace(/\.mp3$/i, '');
        }
        
        play.src = "img/pause.svg";
      }
    });
  });

  // Login Modal Event Listeners
  const loginBtn = document.getElementById('loginBtn');
  const closeModal = document.getElementById('closeModal');
  const loginForm = document.getElementById('loginForm');
  const modalOverlay = document.getElementById('loginModal');

  if (loginBtn) {
    loginBtn.addEventListener('click', openLoginModal);
  }

  if (closeModal) {
    closeModal.addEventListener('click', closeLoginModal);
  }

  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  }

  // Close modal when clicking outside of it
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        closeLoginModal();
      }
    });
  }

  // Close modal with Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeLoginModal();
    }
  });

  // Attach an event listener to play, next and previous
  const play = document.getElementById("play");
  const previous = document.getElementById("previous");
  const next = document.getElementById("next");

  if (play) {
    play.addEventListener("click", () => {
      if (currentSong.paused) {
        currentSong.play();
        play.src = "img/pause.svg";
      } else {
        currentSong.pause();
        play.src = "img/play.svg";
      }
    });
  }

  // Listen for timeupdate event
  currentSong.addEventListener("timeupdate", () => {
    const songtimeElement = document.querySelector(".songtime");
    const circleElement = document.querySelector(".circle");
    
    if (songtimeElement) {
      songtimeElement.innerHTML = `${secondsToMinutesSeconds(
        currentSong.currentTime
      )} / ${secondsToMinutesSeconds(currentSong.duration)}`;
    }
    
    if (circleElement) {
      circleElement.style.left =
        (currentSong.currentTime / currentSong.duration) * 100 + "%";
    }
  });

  // Add an event listener to seekbar
  const seekbar = document.querySelector(".seekbar");
  if (seekbar) {
    seekbar.addEventListener("click", (e) => {
      let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
      document.querySelector(".circle").style.left = percent + "%";
      currentSong.currentTime = (currentSong.duration * percent) / 100;
    });
  }

  // Add an event listener for hamburger
  const hamburger = document.querySelector(".hamburger");
  if (hamburger) {
    hamburger.addEventListener("click", () => {
      document.querySelector(".left").style.left = "0";
    });
  }

  // Add an event listener for close button
  const close = document.querySelector(".close");
  if (close) {
    close.addEventListener("click", () => {
      document.querySelector(".left").style.left = "-120%";
    });
  }

  // Add an event listener to previous
  if (previous) {
    previous.addEventListener("click", () => {
      currentSong.pause();
      console.log("Previous clicked");

      let currentPath = currentSong.src;
      let currentIndex = songs.findIndex(s =>
        currentPath.includes(s.file) || currentPath === s.path
      );

      if (currentIndex > 0) {
        playMusic(songs[currentIndex - 1].path);
        // Update song info
        const songInfoElement = document.querySelector(".songinfo");
        if (songInfoElement) {
          songInfoElement.textContent = songs[currentIndex - 1].file.replace(/\.mp3$/i, '');
        }
      } else if (currentIndex === 0) {
        // If at first song, go to last song
        playMusic(songs[songs.length - 1].path);
        const songInfoElement = document.querySelector(".songinfo");
        if (songInfoElement) {
          songInfoElement.textContent = songs[songs.length - 1].file.replace(/\.mp3$/i, '');
        }
      }
    });
  }

  // Add an event listener to next
  if (next) {
    next.addEventListener("click", () => {
      currentSong.pause();
      console.log("Next clicked");

      let currentPath = currentSong.src;
      let currentIndex = songs.findIndex(s =>
        currentPath.includes(s.file) || currentPath === s.path
      );

      if (currentIndex >= 0 && currentIndex < songs.length - 1) {
        playMusic(songs[currentIndex + 1].path);
        // Update song info
        const songInfoElement = document.querySelector(".songinfo");
        if (songInfoElement) {
          songInfoElement.textContent = songs[currentIndex + 1].file.replace(/\.mp3$/i, '');
        }
      } else if (currentIndex === songs.length - 1) {
        // If at last song, go to first song
        playMusic(songs[0].path);
        const songInfoElement = document.querySelector(".songinfo");
        if (songInfoElement) {
          songInfoElement.textContent = songs[0].file.replace(/\.mp3$/i, '');
        }
      }
    });
  }

  // Add an event to volume
  const volumeRange = document.querySelector(".range input[type='range']");
  if (volumeRange) {
    volumeRange.addEventListener("change", (e) => {
      console.log("Setting volume to", e.target.value, "/ 100");
      currentSong.volume = parseInt(e.target.value) / 100;
      if (currentSong.volume > 0) {
        document.querySelector(".volume>img").src = document
          .querySelector(".volume>img")
          .src.replace("mute.svg", "volume.svg");
      }
    });
  }

  // Add event listener to mute the track
  const volumeImg = document.querySelector(".volume>img");
  if (volumeImg) {
    volumeImg.addEventListener("click", (e) => {
      if (e.target.src.includes("volume.svg")) {
        e.target.src = e.target.src.replace("volume.svg", "mute.svg");
        currentSong.volume = 0;
        document.querySelector(".range input[type='range']").value = 0;
      } else {
        e.target.src = e.target.src.replace("mute.svg", "volume.svg");
        currentSong.volume = 0.1;
        document.querySelector(".range input[type='range']").value = 10;
      }
    });
  }

  // Add event listeners to playlist cards
  document.querySelectorAll(".card a").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const songPath = link.getAttribute("href");
      if (songPath) {
        playMusic(songPath);
        // Update song info with the file name from path
        const fileName = songPath.split('/').pop();
        const songInfoElement = document.querySelector(".songinfo");
        if (songInfoElement) {
          songInfoElement.textContent = fileName.replace(/\.mp3$/i, '');
        }
      }
    });
  });

  // Auto-play next song when current song ends
  currentSong.addEventListener("ended", () => {
    let currentPath = currentSong.src;
    let currentIndex = songs.findIndex(s =>
      currentPath.includes(s.file) || currentPath === s.path
    );

    if (currentIndex >= 0 && currentIndex < songs.length - 1) {
      playMusic(songs[currentIndex + 1].path);
      const songInfoElement = document.querySelector(".songinfo");
      if (songInfoElement) {
        songInfoElement.textContent = songs[currentIndex + 1].file.replace(/\.mp3$/i, '');
      }
    } else if (currentIndex === songs.length - 1) {
      // If at last song, go to first song
      playMusic(songs[0].path);
      const songInfoElement = document.querySelector(".songinfo");
      if (songInfoElement) {
        songInfoElement.textContent = songs[0].file.replace(/\.mp3$/i, '');
      }
    }
  });
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', main);