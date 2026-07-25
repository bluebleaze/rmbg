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
  function processQueue(){
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

    var t0=Date.now();
    var form=new FormData();
    form.append('image',job.file,job.file.name);
    form.append('format','png');
    form.append('model','v1');

    fetch('/api/removebg',{
      method:'POST',
      body:form
    }).then(function(res){
      if(!res.ok)throw new Error('server '+res.status);
      return res.blob();
    }).then(function(blob){
      if(blob.size<100)throw new Error('empty response');
      job.resultBlob=blob;
      job.resultUrl=URL.createObjectURL(blob);
      job.status='done';
      job.duration=((Date.now()-t0)/1000).toFixed(1);
    }).catch(function(e){
      job.status='error';
      job.error=e.message;
    }).finally(function(){
      renderQueue();
      processQueue();
    });
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
        '<div class="card-actions"><button class="term-btn primary dl-single" data-idx="'+j+'">⬇ download</button></div>';
      resultsGrid.appendChild(card);
    }

    // bind single downloads
    var dlBtns=resultsGrid.querySelectorAll('.dl-single');
    for(var d=0;d<dlBtns.length;d++){
      dlBtns[d].addEventListener('click',function(){
        var idx=parseInt(this.getAttribute('data-idx'));
        downloadBlob(jobs[idx].resultBlob,jobs[idx].file.name.replace(/\.[^.]+$/,'')+'-nobg.png');
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
        downloadBlob(jobs[i].resultBlob,jobs[i].file.name.replace(/\.[^.]+$/,'')+'-nobg.png');
      }
    }
  });

  resetBtn.addEventListener('click',function(){
    jobs=[];processing=false;stopSpin();
    queueEl.style.display='none';progressWrap.style.display='none';
    resultsArea.style.display='none';statsSummary.style.display='none';
    globalActions.style.display='none';errorEl.style.display='none';
    dropZone.style.display='block';progressFill.style.width='0%';
    queueList.innerHTML='';resultsGrid.innerHTML='';
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
