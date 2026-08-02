import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js';

// Disable local models since we are running in browser
env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = 1;

(function(){
  'use strict';

  /* ── Spinner ── */
  var spinFrames=['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'];
  var spinIdx=0,spinEl=null,spinTimer=null;
  function startSpin(el){spinEl=el;spinTimer=setInterval(function(){spinIdx=(spinIdx+1)%spinFrames.length;spinEl.textContent=spinFrames[spinIdx]},80)}
  function stopSpin(){if(spinTimer){clearInterval(spinTimer);spinTimer=null}}

  /* ── DOM refs ── */
  var nav=document.querySelector('.nav');
  var hamburger=document.querySelector('.hamburger');
  var navLinks=document.querySelector('.nav-links');
  var dropZone=document.getElementById('dropZone');
  var fileInput=document.getElementById('fileInput');
  var queueEl=document.getElementById('queue');
  var queueList=document.getElementById('queueList');
  var queueCount=document.getElementById('queueCount');
  var progressWrap=document.getElementById('progressWrap');
  var progressFill=document.getElementById('progressFill');
  var progressText=document.getElementById('progressText');
  var progressPct=document.getElementById('progressPct');
  var fallbackInfo=document.getElementById('fallbackInfo');
  var resultsArea=document.getElementById('resultsArea');
  var resultsGrid=document.getElementById('resultsGrid');
  var globalActions=document.getElementById('globalActions');
  var statsSummary=document.getElementById('statsSummary');
  var summaryText=document.getElementById('summaryText');
  var downloadAllBtn=document.getElementById('downloadAllBtn');
  var resetBtn=document.getElementById('resetBtn');
  var errorEl=document.getElementById('error');

  /* ── State ── */
  var jobs=[];       // {file, origUrl, resultBlob, resultUrl, status, duration, error}
  var processing=false;
  var useFallback=false;
  var fallbackPipeline=null;
  var currentMode='rmbg'; // 'rmbg' or 'hd' or 'tiktok'

  /* ── ASCII box animation ── */
  var asciiBox = document.getElementById('asciiBox');
  function animateAsciiBox(){
    var raw=asciiBox.textContent.trim();
    var lines=raw.split('\n');
    asciiBox.innerHTML='';
    var scanline=document.createElement('div');
    scanline.className='scanline';
    asciiBox.appendChild(scanline);
    asciiBox.classList.remove('glow');
    lines.forEach(function(line){
      var span=document.createElement('span');
      span.className='ascii-line';
      span.textContent=line||'\u00a0';
      asciiBox.appendChild(span);
    });
    var spans=asciiBox.querySelectorAll('.ascii-line');
    spans.forEach(function(s,i){
      setTimeout(function(){s.classList.add('visible')},i*60);
    });
    setTimeout(function(){
      scanline.classList.add('active');
      asciiBox.classList.add('glow');
    },spans.length*60+200);
  }
  animateAsciiBox();

  var termOutput = document.getElementById('termOutput');
  var defaultTermOutput = termOutput.innerHTML;

  /* ── TikTok DOM refs ── */
  var tiktokInput = document.getElementById('tiktokInput');
  var ttUrl = document.getElementById('ttUrl');
  var ttGoBtn = document.getElementById('ttGoBtn');
  var tiktokResult = document.getElementById('tiktokResult');
  var ttCover = document.getElementById('ttCover');
  var ttAuthor = document.getElementById('ttAuthor');
  var ttTitle = document.getElementById('ttTitle');
  var ttStats = document.getElementById('ttStats');
  var ttMusic = document.getElementById('ttMusic');
  var ttDownloads = document.getElementById('ttDownloads');

  /* ── Mode Switching ── */
  var modeSwitches = document.querySelectorAll('.mode-switch');
  var promptCmd = document.getElementById('promptCmd');

  function hideAllInputs() {
    dropZone.style.display = 'none';
    tiktokInput.style.display = 'none';
    tiktokResult.style.display = 'none';
  }

  modeSwitches.forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      
      modeSwitches.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      currentMode = this.getAttribute('data-mode');
      promptCmd.textContent = 'ruby-tools --' + currentMode;
      hideAllInputs();
      
      if (currentMode === 'rmbg') {
        asciiBox.textContent = '┌─────────────────────────┐\n│                         │\n│   ╭───────────────╮     │\n│   │ rmbg v2.0     │     │\n│   │ AI removal    │     │\n│   │               │     │\n│   │ usage: upload │     │\n│   │ format: image │     │\n│   │               │     │\n│   │ out: .png     │     │\n│   ╰───────────────╯     │\n│                         │\n└─────────────────────────┘';
        animateAsciiBox();
        dropZone.style.display = 'block';
        dropZone.style.pointerEvents = 'auto';
        dropZone.style.opacity = '1';
        document.querySelector('.gz-label').innerHTML = 'drag images here or <span>browse</span>';
        document.querySelector('.gz-hint').style.display = 'block';
        termOutput.innerHTML = defaultTermOutput;
      } else if (currentMode === 'hd') {
        asciiBox.textContent = '┌─────────────────────────┐\n│                         │\n│   ╭───────────────╮     │\n│   │ hd-ify v1.0   │     │\n│   │ AI enhancer   │     │\n│   │               │     │\n│   │ STATUS:       │     │\n│   │ COMING SOON   │     │\n│   │ (API OFFLINE) │     │\n│   │               │     │\n│   ╰───────────────╯     │\n│                         │\n└─────────────────────────┘';
        animateAsciiBox();
        dropZone.style.display = 'block';
        dropZone.style.pointerEvents = 'none';
        dropZone.style.opacity = '0.4';
        document.querySelector('.gz-label').innerHTML = 'HD mode is currently <span style="color:var(--error)">coming soon</span>';
        document.querySelector('.gz-hint').style.display = 'none';
        termOutput.innerHTML = defaultTermOutput;
      } else if (currentMode === 'tiktok') {
        asciiBox.textContent = '┌─────────────────────────┐\n│                         │\n│   ╭───────────────╮     │\n│   │ tiktok-dl 1.0 │     │\n│   │ no watermark  │     │\n│   │               │     │\n│   │ usage: paste  │     │\n│   │ format: mp4   │     │\n│   │               │     │\n│   │ + audio       │     │\n│   ╰───────────────╯     │\n│                         │\n└─────────────────────────┘';
        animateAsciiBox();
        tiktokInput.style.display = 'block';
        ttUrl.value = '';
        document.getElementById('termOutput').innerHTML =
          '<span class="dim">$</span> <span class="flag">paste</span> tiktok url below<br>' +
          '<span class="dim">$</span> <span class="flag">video</span> downloaded without watermark<br>' +
          '<span class="dim">$</span> <span class="flag">audio</span> extracted separately';
      }
      
      resetBtn.click();
      
      if (hamburger.classList.contains('active')) {
        hamburger.classList.remove('active');
        navLinks.classList.remove('open');
      }
    });
  });

  // Show dropZone by default for rmbg
  dropZone.style.display = 'block';

  /* ── TikTok Download ── */
  function formatNum(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return '' + n;
  }

  async function doTiktokDownload() {
    var url = ttUrl.value.trim();
    if (!url) { showError('paste a tiktok url first'); return; }
    if (!/tiktok|douyin/.test(url)) { showError('not a valid tiktok/douyin url'); return; }

    errorEl.style.display = 'none';
    tiktokResult.style.display = 'none';
    progressWrap.style.display = 'block';
    startSpin(document.querySelector('.spinner'));
    setProgress(30, 'fetching tiktok data...');
    ttGoBtn.disabled = true;
    ttGoBtn.textContent = 'loading...';

    var apiUrl = window.location.hostname.includes('vercel.app') ? '/api/tiktok.js' : '/api/tiktok';

    try {
      var res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url }),
      });

      if (!res.ok) {
        var errData = await res.json().catch(function() { return {}; });
        throw new Error(errData.error || 'server ' + res.status);
      }

      var json = await res.json();
      if (!json.ok) throw new Error(json.error || 'unknown error');

      var r = json.result;
      setProgress(100, 'done');

      // Populate card
      var proxyBase = window.location.hostname.includes('vercel.app') ? '/api/tiktok-proxy.js?url=' : '/api/tiktok-proxy?url=';
      // Cover from TikTok oEmbed CDN — no proxy needed
      ttCover.src = r.cover || '';
      ttCover.style.display = r.cover ? 'block' : 'none';
      ttAuthor.textContent = '@' + (r.author.unique_id || r.author.nickname || 'unknown');
      ttTitle.textContent = r.title || 'no caption';
      ttStats.innerHTML =
        '<span>▶ ' + formatNum(r.stats.views) + '</span>' +
        '<span>♥ ' + formatNum(r.stats.likes) + '</span>' +
        '<span>💬 ' + formatNum(r.stats.comments) + '</span>' +
        '<span>↗ ' + formatNum(r.stats.shares) + '</span>';
      ttMusic.textContent = r.music_title ? '♪ ' + r.music_title : '';
      ttMusic.style.display = r.music_title ? 'block' : 'none';

      // Build download links
      ttDownloads.innerHTML = '';

      // Videos/Photos
      for (var i = 0; i < r.media.length; i++) {
        var m = r.media[i];
        var item = document.createElement('div');
        item.className = 'tt-dl-item';

        var labelMap = {
          'nowatermark': 'Video (No Watermark)',
          'nowatermark_hd': 'Video HD (No Watermark)',
          'watermark': 'Video (With Watermark)',
          'photo': 'Photo ' + (i + 1),
        };

        item.innerHTML =
          '<div><span class="tt-dl-type">' + escHtml(m.type) + '</span> ' +
          '<span class="tt-dl-label">' + (labelMap[m.type] || m.type) + '</span></div>' +
          '<a href="' + proxyBase + encodeURIComponent(m.url) + '" target="_blank" class="term-btn primary" download>⬇ download</a>';
        ttDownloads.appendChild(item);
      }

      // Audio
      if (r.music) {
        var audioItem = document.createElement('div');
        audioItem.className = 'tt-dl-item';
        audioItem.innerHTML =
          '<div><span class="tt-dl-type">audio</span> ' +
          '<span class="tt-dl-label">♪ ' + escHtml(r.music_title || 'Original Sound') + '</span></div>' +
          '<a href="' + proxyBase + encodeURIComponent(r.music) + '" target="_blank" class="term-btn primary" download>⬇ download</a>';
        ttDownloads.appendChild(audioItem);
      }

      tiktokResult.style.display = 'block';

    } catch (e) {
      showError(e.message);
    } finally {
      stopSpin();
      progressWrap.style.display = 'none';
      ttGoBtn.disabled = false;
      ttGoBtn.textContent = '⬇ download';
    }
  }

  ttGoBtn.addEventListener('click', doTiktokDownload);
  ttUrl.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') doTiktokDownload();
  });

  /* ── Nav scroll ── */
  window.addEventListener('scroll',function(){nav.classList.toggle('scrolled',window.scrollY>20)},{passive:true});

  /* ── Hamburger ── */
  hamburger.addEventListener('click',function(){
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('open');
  });
  navLinks.addEventListener('click',function(e){
    if(e.target.tagName==='A'){hamburger.classList.remove('active');navLinks.classList.remove('open')}
  });

  /* ── Drop zone ── */
  dropZone.addEventListener('click',function(){fileInput.click()});
  dropZone.addEventListener('dragover',function(e){e.preventDefault();dropZone.classList.add('drag-over')});
  dropZone.addEventListener('dragleave',function(){dropZone.classList.remove('drag-over')});
  dropZone.addEventListener('drop',function(e){
    e.preventDefault();dropZone.classList.remove('drag-over');
    addFiles(e.dataTransfer.files);
  });
  fileInput.addEventListener('change',function(){addFiles(fileInput.files);fileInput.value=''});

  /* ── Add files ── */
  function addFiles(fileList){
    var added=false;
    for(var i=0;i<fileList.length;i++){
      var f=fileList[i];
      if(!/^image\/(jpeg|png)$/.test(f.type))continue;
      if(f.size>10*1024*1024)continue;
      jobs.push({file:f,origUrl:URL.createObjectURL(f),resultBlob:null,resultUrl:null,status:'pending',duration:0,error:null});
      added=true;
    }
    if(!added){showError('only jpg/png under 10 MB');return}
    errorEl.style.display='none';
    renderQueue();
    if(!processing)processQueue();
  }

  /* ── Render queue ── */
  function renderQueue(){
    queueEl.style.display='block';
    queueCount.textContent=jobs.length+' file'+(jobs.length>1?'s':'');
    queueList.innerHTML='';
    for(var i=0;i<jobs.length;i++){
      var j=jobs[i];
      var item=document.createElement('div');
      item.className='queue-item';

      var thumb=document.createElement('img');
      thumb.className='thumb';thumb.src=j.origUrl;

      var info=document.createElement('div');
      info.className='file-info';
      info.innerHTML='<div class="file-name">'+escHtml(j.file.name)+'</div><div class="file-size">'+formatSize(j.file.size)+'</div>';

      var status=document.createElement('div');
      status.className='file-status '+j.status;
      if(j.status==='pending')status.textContent='queued';
      else if(j.status==='processing')status.textContent='processing...';
      else if(j.status==='done')status.textContent='✓ done ('+j.duration+'s)';
      else status.textContent='✗ '+j.error;

      item.appendChild(thumb);item.appendChild(info);item.appendChild(status);
      queueList.appendChild(item);
    }
  }

  /* ── Process queue ── */
  async function processQueue(){
    var next=-1;
    for(var i=0;i<jobs.length;i++){if(jobs[i].status==='pending'){next=i;break}}
    if(next===-1){finishAll();return}

    processing=true;
    var job=jobs[next];
    job.status='processing';
    renderQueue();

    var done=0,total=jobs.length;
    for(var k=0;k<jobs.length;k++){if(jobs[k].status==='done'||jobs[k].status==='error')done++}

    progressWrap.style.display='block';
    startSpin(document.querySelector('.spinner'));
    var globalPct=Math.round((done/total)*100);
    setProgress(globalPct,'processing '+(done+1)+'/'+total+': '+job.file.name);

    if (useFallback) fallbackInfo.style.display = 'block';

    var t0=Date.now();

    try {
      if (currentMode === 'rmbg' && useFallback) {
        await runLocalFallback(job, t0);
      } else {
        var form=new FormData();
        var proxyUrl = '';
        
        if (currentMode === 'rmbg') {
          form.append('image',job.file,job.file.name);
          form.append('format','png');
          form.append('model','v1');
          proxyUrl = window.location.hostname.includes('vercel.app') ? '/api/removebg.js' : '/api/removebg';
        } else if (currentMode === 'hd') {
          form.append('image',job.file,job.file.name);
          proxyUrl = window.location.hostname.includes('vercel.app') ? '/api/enhance.js' : '/api/enhance';
        }

        const res = await fetch(proxyUrl, { method:'POST', body:form });
        if(!res.ok) throw new Error('server '+res.status);
        
        const blob = await res.blob();
        if(blob.size<100) throw new Error('empty response');
        
        job.resultBlob=blob;
        job.resultUrl=URL.createObjectURL(blob);
        job.status='done';
        job.duration=((Date.now()-t0)/1000).toFixed(1);
      }
    } catch(e) {
      if (currentMode === 'rmbg' && !useFallback) {
        console.log('RMBG API failed, switching to local fallback mode...', e);
        useFallback = true;
        fallbackInfo.style.display = 'block';
        try {
          await runLocalFallback(job, t0);
        } catch(fallbackErr) {
          job.status='error';
          job.error='fallback failed: ' + fallbackErr.message;
        }
      } else {
        job.status='error';
        job.error=e.message;
      }
    } finally {
      renderQueue();
      processQueue();
    }
  }

  async function runLocalFallback(job, t0) {
    setProgress(10, 'loading ai model (once)...');
    
    if (!fallbackPipeline) {
      fallbackPipeline = await pipeline('image-segmentation', 'briaai/RMBG-1.4', {
        revision: 'main',
        progress_callback: data => {
          if (data.status === 'progress') {
            setProgress(10 + Math.round(data.progress * 0.4), 'downloading model: ' + Math.round(data.progress) + '%');
          }
        }
      });
    }

    setProgress(50, 'analyzing image locally...');
    
    // Read file as url for pipeline
    const url = await new Promise(r => {
      const reader = new FileReader();
      reader.onload = () => r(reader.result);
      reader.readAsDataURL(job.file);
    });

    const result = await fallbackPipeline(url);
    setProgress(90, 'generating transparent png...');

    // Convert output to blob
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    await new Promise(r => {
      img.onload = r;
      img.src = url;
    });

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);

    const mask = await createImageBitmap(new ImageData(
      new Uint8ClampedArray(result[0].mask.data),
      result[0].mask.width,
      result[0].mask.height
    ));

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(mask, 0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(tempCanvas, 0, 0);

    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    
    job.resultBlob=blob;
    job.resultUrl=URL.createObjectURL(blob);
    job.status='done';
    job.duration=((Date.now()-t0)/1000).toFixed(1);
  }

  /* ── Finish all ── */
  function finishAll(){
    processing=false;
    stopSpin();
    progressWrap.style.display='none';

    var okCount=0,errCount=0,totalTime=0,totalSize=0;
    for(var i=0;i<jobs.length;i++){
      if(jobs[i].status==='done'){okCount++;totalTime+=parseFloat(jobs[i].duration);totalSize+=jobs[i].resultBlob.size}
      if(jobs[i].status==='error')errCount++;
    }

    // render results
    resultsGrid.innerHTML='';
    for(var j=0;j<jobs.length;j++){
      if(jobs[j].status!=='done')continue;
      var card=document.createElement('div');
      card.className='result-card';
      card.innerHTML=
        '<div class="card-title"><span>'+escHtml(jobs[j].file.name)+'</span><span class="card-meta">'+jobs[j].duration+'s │ '+formatSize(jobs[j].resultBlob.size)+'</span></div>'+
        '<div class="img-compare">'+
          '<div><div class="img-side orig"><img src="'+jobs[j].origUrl+'"></div><div class="img-side-label">original</div></div>'+
          '<div><div class="img-side result"><img src="'+jobs[j].resultUrl+'"></div><div class="img-side-label">result</div></div>'+
        '</div>'+
        '<div class="card-actions">'+
          '<button class="term-btn primary dl-single" data-idx="'+j+'">⬇ download</button>'+
          '<button class="term-btn preview-single" data-idx="'+j+'">👁 preview</button>'+
        '</div>';
      resultsGrid.appendChild(card);
    }

    // bind single downloads
    var dlBtns=resultsGrid.querySelectorAll('.dl-single');
    for(var d=0;d<dlBtns.length;d++){
      dlBtns[d].addEventListener('click',function(){
        var idx=parseInt(this.getAttribute('data-idx'));
        var ext = currentMode === 'hd' ? '-hd.jpg' : '-nobg.png';
        downloadBlob(jobs[idx].resultBlob,jobs[idx].file.name.replace(/\.[^.]+$/,'')+ext);
      });
    }

    // bind previews
    var pBtns=resultsGrid.querySelectorAll('.preview-single');
    for(var p=0;p<pBtns.length;p++){
      pBtns[p].addEventListener('click',function(){
        var idx=parseInt(this.getAttribute('data-idx'));
        var popup=document.createElement('div');
        popup.style.position='fixed';
        popup.style.top='0';popup.style.left='0';popup.style.right='0';popup.style.bottom='0';
        popup.style.backgroundColor='rgba(0,0,0,0.9)';
        popup.style.zIndex='9999';
        popup.style.display='flex';
        popup.style.flexDirection='column';
        popup.style.alignItems='center';
        popup.style.justifyContent='center';
        popup.style.backdropFilter='blur(6px)';
        popup.style.cursor='zoom-out';
        
        var container=document.createElement('div');
        container.style.display='flex';
        container.style.gap='24px';
        container.style.maxWidth='90vw';
        container.style.maxHeight='85vh';
        container.style.alignItems='center';
        container.style.justifyContent='center';
        
        var beforeWrap=document.createElement('div');
        beforeWrap.style.display='flex';
        beforeWrap.style.flexDirection='column';
        beforeWrap.style.alignItems='center';
        beforeWrap.style.gap='8px';
        
        var beforeImg=document.createElement('img');
        beforeImg.src=jobs[idx].origUrl;
        beforeImg.style.maxWidth='42vw';
        beforeImg.style.maxHeight='75vh';
        beforeImg.style.objectFit='contain';
        beforeImg.style.borderRadius='8px';
        beforeImg.style.boxShadow='0 10px 30px rgba(0,0,0,0.5)';
        
        var beforeLabel=document.createElement('span');
        beforeLabel.textContent='original';
        beforeLabel.style.color='var(--muted)';
        beforeLabel.style.fontFamily='var(--mono)';
        beforeLabel.style.fontSize='12px';
        beforeLabel.style.textTransform='uppercase';
        beforeLabel.style.letterSpacing='2px';
        
        beforeWrap.appendChild(beforeImg);
        beforeWrap.appendChild(beforeLabel);
        
        var afterWrap=document.createElement('div');
        afterWrap.style.display='flex';
        afterWrap.style.flexDirection='column';
        afterWrap.style.alignItems='center';
        afterWrap.style.gap='8px';
        
        var afterImg=document.createElement('img');
        afterImg.src=jobs[idx].resultUrl;
        afterImg.style.maxWidth='42vw';
        afterImg.style.maxHeight='75vh';
        afterImg.style.objectFit='contain';
        afterImg.style.background='repeating-conic-gradient(var(--border) 0% 25%,var(--surface) 0% 50%) 50%/20px 20px';
        afterImg.style.borderRadius='8px';
        afterImg.style.boxShadow='0 10px 30px rgba(0,0,0,0.5)';
        
        var afterLabel=document.createElement('span');
        afterLabel.textContent='result';
        afterLabel.style.color='var(--accent)';
        afterLabel.style.fontFamily='var(--mono)';
        afterLabel.style.fontSize='12px';
        afterLabel.style.textTransform='uppercase';
        afterLabel.style.letterSpacing='2px';
        
        afterWrap.appendChild(afterImg);
        afterWrap.appendChild(afterLabel);
        
        container.appendChild(beforeWrap);
        container.appendChild(afterWrap);
        popup.appendChild(container);
        
        document.body.appendChild(popup);
        popup.addEventListener('click',function(){popup.remove()});
      });
    }

    // summary
    var summaryParts=[
      '<span class="ok">✓ '+okCount+' processed</span>'
    ];
    if(errCount>0)summaryParts.push('<span style="color:var(--error)">✗ '+errCount+' failed</span>');
    summaryParts.push('<span class="val">'+totalTime.toFixed(1)+'s total</span>');
    summaryParts.push('<span class="val">'+formatSize(totalSize)+'</span>');
    summaryText.innerHTML=summaryParts.join('<span class="sep">│</span>');

    resultsArea.style.display='block';
    statsSummary.style.display='block';
    globalActions.style.display='flex';
    if(okCount<2)downloadAllBtn.style.display='none';
  }

  /* ── Global actions ── */
  downloadAllBtn.addEventListener('click',function(){
    for(var i=0;i<jobs.length;i++){
      if(jobs[i].status==='done'){
        var ext = currentMode === 'hd' ? '-hd.jpg' : '-nobg.png';
        downloadBlob(jobs[i].resultBlob,jobs[i].file.name.replace(/\.[^.]+$/,'')+ext);
      }
    }
  });

  resetBtn.addEventListener('click',function(){
    jobs=[];processing=false;stopSpin();
    queueEl.style.display='none';progressWrap.style.display='none';fallbackInfo.style.display='none';
    resultsArea.style.display='none';statsSummary.style.display='none';
    globalActions.style.display='none';errorEl.style.display='none';
    if(currentMode !== 'tiktok') dropZone.style.display='block';
    progressFill.style.width='0%';
    queueList.innerHTML='';resultsGrid.innerHTML='';
    tiktokResult.style.display='none';
  });

  /* ── Helpers ── */
  function setProgress(pct,text){
    progressFill.style.width=pct+'%';
    progressPct.textContent=pct+'%';
    progressText.textContent=text;
  }

  function showError(msg){errorEl.textContent='error: '+msg;errorEl.style.display='block'}

  function formatSize(b){
    if(b<1024)return b+' B';
    if(b<1048576)return(b/1024).toFixed(1)+' KB';
    return(b/1048576).toFixed(1)+' MB';
  }

  function downloadBlob(blob,name){
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();
  }

  function escHtml(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

})();
