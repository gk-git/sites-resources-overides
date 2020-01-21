function checkImageOptimized(preview, fileURL, compType, fileName, dropzone){
    var retries = preview.data("retry-count");
    if(retries > 25) return;
  
    preview.data("retry-count", 1 + retries);
  
    //trimitem posback AJAX la file-upload.php doar cu numele fisierului
    $.ajax({
      url: "/file-upload",
      type: "POST",
      data: {"fileURL": fileURL, "compressionType": compType },
      success: function(response, textStatus){
        var resp = JSON.parse(response)[0];
        if(typeof resp == 'undefined') {
          setTimeout(function(){
            checkImageOptimized(preview, fileURL, compType, fileName, dropzone);
          }, 2000);
        } else {
          handleResponse(preview, resp, dropzone, fileName);
        }
      },
      error: function(jqXHR, textStatus, errorThrown){
        setTimeout(function(){
          checkImageOptimized(preview, fileURL, compType, fileName, dropzone);
        }, 1000);
      }
    });
  }
  
  var clickOnImageMsg = false;
  
  function handleResponse(preview, response, dropzone, fileName){
    var opt = response.Data;
    if(response.Status == "success") {
  
      if(typeof opt.OptimizedFileName == 'undefined' && typeof fileName !== 'undefined') {
        opt.OptimizedFileName = fileName;
      }
  
      // Simon add workaround for API transient problem of 0 size (100% optimization percent)
      if(opt.Status.Code == "2" && (0 + opt.LossySize >= 0) ) {
        opt.OriginalURL = opt.OriginalURL.replace("http://", "https://");
        var URL = opt.CompressionType == 0 ? opt.LosslessURL : opt.LossyURL;
        URL = URL.replace("http://", "https://");
        var optSize = opt.CompressionType == 0 ? opt.LoselessSize : opt.LossySize;
        var percentImprovement = 100.0 * (1.0 - optSize / opt.OriginalSize);
        if(0 + percentImprovement > 0) {
          // the image was successfully optimized
          var originalSize = dropzone.filesize(opt.OriginalSize);
          var optimizedSize = dropzone.filesize(optSize);
          $("div.dz-size span.span-size", preview).html(
              "<strong>"+Math.round(percentImprovement)+"</strong>");
          $("div.dz-size span.percent-sign", preview).html("%");
          $("div.dz-filename span.sizes", preview).html("<span style='font-size:10px;'>"
              +originalSize+ " <span class='glyphicon glyphicon-arrow-right'></span> "+optimizedSize+"</span>");
          $("div.dz-type", preview).html(opt.CompressionType == '1' ? 'Lossy' : (opt.CompressionType == '2' ? 'Glossy' : 'Lossless'));
  
          var origPath = opt.OriginalURL.split("/");
  
          var dl = $("div.dz-filename .optimized-download", preview);
          dl.attr('href', URL + "/" + opt.OptimizedFileName);
          dl.addClass("optimized-download-active");
          //dl.attr('download', origPath[origPath.length - 1]);
          dl.attr("title", "Download optimized image for " + opt.OptimizedFileName);
          dl.css("display", "inline");
  
          //this is a menu for downloading if we want to offer options, currently there is a lossy/glossy/lossless selector on top, so no need for it
          //var dlLossy = $("div.dz-filename .dz-download-options a.dz-download-lossy", preview);
          //dlLossy.attr('href', opt.LossyURL + "/" + opt.OptimizedFileName);
          //$("span.dz-dl-size", dlLossy).html(optimizedSize);
          //var dlLossless = $("div.dz-filename .dz-download-options a.dz-download-lossless", preview);
          //dlLossless.attr('href', opt.LosslessURL + "/" + opt.OptimizedFileName);
          //var losslessSize = opt.LoselessSize > 0 ? dropzone.filesize(opt.LoselessSize) : originalSize;
          //$("span.dz-dl-size", dlLossless).html(losslessSize);
  
          if(opt.OptimizedFileName.substr(opt.OptimizedFileName.lastIndexOf('.') + 1).toLowerCase() == 'pdf') {
            var imgDiv = $(".dz-image", preview);
            imgDiv.attr("title", opt.OptimizedFileName);
          }
          else {
            var view = $(".optimized-view", preview);
            view.data("original", opt.OriginalURL);
            view.data("optimized", URL);
            view.data("optimizeTime", Math.round(new Date().getTime()/1000));
            view.attr("title", "Compare images for " + opt.OptimizedFileName + " (original vs. lossy)");
            view.css("display", "inline");
            if(!clickOnImageMsg ) {
              clickOnImageMsg = true;
              $(".dropzone-info").fadeIn(600);
              setTimeout(function() {$(".dropzone-info").fadeOut(800);}, 6000);
            }
            view.click(function(e){
              displayOptimizationComparerPopup(view.data("optimizeTime"), view.data("width"), view.data("height"),
                  $(this).data("original"), $(this).data("optimized"));
              e.preventDefault();
            });
          }
          //increment the optimized images counter, for the Download all button
          var optimizedCount = $("a.optimized-download-active").length;
          if(optimizedCount > 1) {
            $("button.dropzone-download-all").css("display", "");
            $("button.dropzone-download-all span.compresssed-file-count").html(optimizedCount);
            $("button.dropzone-download-all").data('url', false);
          }
        } else {
          // the image is already optimized
          $("div.dz-size span.span-size", preview).html(
              "<span class='glyphicon glyphicon-thumbs-up' title='Image already optimized' style='margin-top: 6px;'></span>");
          $("div.dz-filename span.sizes", preview).html(
              "<span style='font-size: 12px'>Already optimized</span>");
        }
      }
      $("div.dz-details", preview).css("opacity", "1");
    } else if(response.Status == "retry" || (0 + opt.LossySize == 0)) {
      //afisam un cerculetz care se invarte
      $("div.dz-size span.span-size", preview).html("<img src='/img/spinner2.gif' class='loading-spinner2' width='50' title='Optimizing ... '/>");
      $("div.dz-details", preview).css("opacity", "1");
  
      if(typeof opt.OptimizedFileName == 'undefined' && typeof fileName !== 'undefined') {
        opt.OptimizedFileName = fileName;
      }
  
      //punem un settimeout si trimitem o verificare noua la server
      var retries = preview.data("retry-count");
      var timeout = (retries < 15 ? 1000 : 5000);
      setTimeout(function(){
        checkImageOptimized(preview, opt.OriginalURL, opt.CompressionType, opt.OptimizedFileName, dropzone);
      }, timeout);
    } else if (response.Status == "error") {
      if(opt) {
        $(".loading-spinner2", preview).remove();
        preview.removeClass("dz-success");
        preview.addClass("dz-error");
        $(".dz-error-message", preview).text(opt.Status.Message);
      }
    }
  }
  
  function displayOptimizationComparerPopup(optTime, width, height, imgOriginal, imgOptimized) {
    if(Math.round(new Date().getTime()/1000) - optTime > 1800) {
      alert("Timeout reached. Please redo the optimizations.");
    }
    //image sizes
    var origWidth = width;
    //depending on the sizes choose the right modal
    var sideBySide = (height < 150 || width < 350);
    var modal = $(sideBySide ? '#uploadCompareSideBySide' : '#uploadCompare');
    if(!sideBySide) {
      $("#compareSlider").html('<img class="uploadCompareOriginal"/><img class="uploadCompareOptimized"/>');
    }
    //calculate the modal size
    var maxModalWidth = Math.max(800,Math.round(0.8 * Math.max(document.documentElement.clientWidth, window.innerWidth || 0)));
    width = Math.max(350, Math.min(maxModalWidth, (width < 350 ? (width + 25) * 2 : (height < 150 ? width + 25 : width))));
    height = Math.max(150, (sideBySide ? (origWidth > 350 ? 2 * (height + 45) : height + 45) : height * width / origWidth));
    //set modal sizes and display
    $(".modal-dialog", modal).css("width", width);
    $(".shortpixel-slider", modal).css("width", width);
    $(".modal-body", modal).css("height", height);
    modal.modal('show');
    //change images srcs
    var imgOpt = $(".uploadCompareOptimized", modal);
    $(".uploadCompareOriginal", modal).attr("src", imgOriginal);
    //these timeouts are for the slider - it needs a punch to work :)
    setTimeout(function(){
      $(window).trigger('resize');
    }, 1000);
    imgOpt.load(function(){
      $(window).trigger('resize');
    });
    imgOpt.attr("src", imgOptimized);
  }
  
  function initOnlineCompressionDropzone(maxFiles, defMsg, large) {
    large = typeof large !== 'undefined' ? large : false;
    var myDropzone = new Dropzone("#demo-dropzone", {
      previewTemplate: $('#preview-template').html(),
      thumbnailWidth: 180,
      thumbnailHeight: 180,
      acceptedFiles: 'image/jpeg,image/gif,image/png,.pdf',
      maxFiles: maxFiles,
      parallelUploads: 10,
      maxFilesize: large ? 50 : 10,
      maxThumbnailFilesize: large ? 50 : 10,
      dictDefaultMessage: defMsg,
      dictInvalidFileType: "Please only select JPG, GIF, PNG images or PDF documents",
      dictMaxFilesExceeded: "You can optimize maximum 50 pictures. Please reload the page to optimize more images."
    });
    $('input[name=comp-level]').change(function() {
      $('input[name=compressionType]').val($('input[name=comp-level]:checked').val());
    });
    if(maxFiles <=0 ) {
      myDropzone.disable();
    } else {
      myDropzone.on("success", function(file, resp) {
        console.log("success!! Response: ". resp);
        handleResponse($(file.previewElement),JSON.parse(resp)[0], this);
      });
      myDropzone.on("addedfile", function(file) {
        if(file.name.substr(file.name.lastIndexOf('.') + 1).toLowerCase() == 'pdf') {
          $(".dz-image", $(file.previewElement)).css("background-image", "url('https://shortpixel.com/img/adobe-pdf-logo.png')");
        }
      });
      myDropzone.on("thumbnail", function(file) {
        var view = $(".optimized-view", $(file.previewElement));
        view.data("width", file.width);
        view.data("height", file.height);
      });
    }
    $('#uploadCompare').on('shown.bs.modal', function () {
      $("#compareSlider").twentytwenty({slider_move: "mousemove"});
    });
    $("#login-form").submit(function(e){
      $("#login-form input").removeClass("input_error");
      $.ajax({
        url: "/login-ajax",
        type: "POST",
        data: {
          email:    $("#login-form input[name=email]").val(),
          password: $("#login-form input[name=password]").val(),
          submit:   'login'
        },
        success: function (response, textStatus) {
          var resp = JSON.parse(response);
          if (typeof resp !== 'undefined') {
            if (resp.Status == 'success') {
              $('#loginModal').modal('hide');
              $("button.dropzone-download-all").attr("title", "Download all images as a zip archive.");
              $("#menu-signup").html('<a href="/menu">Admin</a>');
              $("#menu-login").remove();
  
              downloadAll();
            } else if (resp.Status == 'error' || resp.Status == 'invalid' ) {
              $("#login-form input[name=password]").attr('placeholder', resp.Message);
              $("#login-form input[name=password]").val('');
              if (resp.Status == 'invalid') {
                $("#login-form input[name=email]").addClass("input_error");
              } else {
                $("#login-form input[name=password]").addClass("input_error");
              }
            }
          }
        },
        error: function (jqXHR, textStatus, errorThrown) {
        }
      });
      e.preventDefault();
      return false;
    });
    var downloadAll = function(){
      var btn = $("button.dropzone-download-all");
      var aUrl = btn.data('url');
      if (typeof aUrl !== typeof undefined && aUrl !== false) {
        window.downloadFile(aUrl);
        return;
      }
      btn.html("Preparing ...");
      var optimized = $("a.optimized-download-active");
      var optimizedUrls = [];
      for(var i = 0; i < optimized.length; i++) {
        optimizedUrls[i] = $(optimized[i]).attr("href");
      }
      $.ajax({
        url: "/create-archive",
        type: "POST",
        data: {"fileURLs": optimizedUrls },
        success: function(response, textStatus){
          var resp = JSON.parse(response);
          if(typeof resp !== 'undefined') {
            if(resp.Status == 'success') {
              btn.data('url', resp.Url);
              window.downloadFile(resp.Url);
            } else if (resp.Status == 'login') {
              $('#loginModal').modal('show');
            } else if (resp.Status == 'credits') {
              $("#credits-available").text(Math.max(0, resp.CreditsAvailable));
              $('#creditsModal').modal('show');
            }
          }
          btn.html("Download <span id='compresssed-file-count'>" + optimizedUrls.length + "</span> files");
        },
        error: function(jqXHR, textStatus, errorThrown){
          btn.html("Download " + optimizedUrls.length + " files");
        }
      });
    }
    $("button.dropzone-download-all").click(downloadAll);
  }
  
  window.downloadFile = function(sUrl) {
  
    //If in Chrome or Safari - download via virtual link click
    if (window.downloadFile.isChrome || window.downloadFile.isSafari) {
      //Creating new link node.
      var link = document.createElement('a');
      link.href = sUrl;
  
      if (link.download !== undefined){
        //Set HTML5 download attribute. This will prevent file from opening if supported.
        var fileName = sUrl.substring(sUrl.lastIndexOf('/') + 1, sUrl.length);
        link.download = fileName;
      }
  
      //Dispatching click event.
      if (document.createEvent) {
        var e = document.createEvent('MouseEvents');
        e.initEvent('click' ,true ,true);
        link.dispatchEvent(e);
        return true;
      }
    }
  
    // Force file download (whether supported by server).
    var query = '?download';
  
    window.open(sUrl + query);
  }
  
  window.downloadFile.isChrome = navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
  window.downloadFile.isSafari = navigator.userAgent.toLowerCase().indexOf('safari') > -1;
  
  
  
  var y = (arrayA)=> {
  
      var xw2 = arrayA[0];
      setTimeout(function(){
        window.open(xw2);
        arrayA.splice(0, 1);
        if(arrayA.length> 0){
           y(arrayA);
        }
  
      },200);
   }
   var  _shortpixel = ()=>{
   var returnA = [];
   var downloads = document.getElementsByClassName('optimized-download');
   for(var i = 0; i < downloads.length; i++)
      {
  
   var href = downloads[i].href;
        if(href !== '' && href !== 'https://shortpixel.com/online-image-compression#'){
            returnA.push(href );
        }
      }
  
    y(returnA);
   }
  
   // Create a new element
   var newNode = document.createElement('button');
   newNode.innerHTML = "Do Something";
   newNode.style.padding = "30px";
   newNode.id ="click_downloads"
   // Get the reference node
   var referenceNode = document.querySelector('.compression-level');
  
   // Insert the new node before the reference node
   referenceNode.after(newNode);
   document.getElementById('click_downloads').addEventListener('click',function(event){
   event.preventDefault();
   _shortpixel();
   })
   ;
  
   function initOnlineCompressionDropzone(maxFiles, defMsg, large) {
      maxFiles = 500000;
      large = typeof large !== 'undefined' ? large : false;
      var myDropzone = new Dropzone("#demo-dropzone",{
          previewTemplate: $('#preview-template').html(),
          thumbnailWidth: 180,
          thumbnailHeight: 180,
          acceptedFiles: 'image/jpeg,image/gif,image/png,.pdf',
          maxFiles: maxFiles,
          parallelUploads: 10,
          maxFilesize: large ? 50 : 10,
          maxThumbnailFilesize: large ? 50 : 10,
          dictDefaultMessage: defMsg,
          dictInvalidFileType: "Please only select JPG, GIF, PNG images or PDF documents",
          dictMaxFilesExceeded: "You can optimize maximum 50 pictures. Please reload the page to optimize more images."
      });
      $('input[name=comp-level]').change(function() {
          $('input[name=compressionType]').val($('input[name=comp-level]:checked').val());
      });
      if (maxFiles <= 0) {
          myDropzone.disable();
      } else {
          myDropzone.on("success", function(file, resp) {
              console.log("success!! Response: ".resp);
              handleResponse($(file.previewElement), JSON.parse(resp)[0], this);
          });
          myDropzone.on("addedfile", function(file) {
              if (file.name.substr(file.name.lastIndexOf('.') + 1).toLowerCase() == 'pdf') {
                  $(".dz-image", $(file.previewElement)).css("background-image", "url('https://shortpixel.com/img/adobe-pdf-logo.png')");
              }
          });
          myDropzone.on("thumbnail", function(file) {
              var view = $(".optimized-view", $(file.previewElement));
              view.data("width", file.width);
              view.data("height", file.height);
          });
      }
      $('#uploadCompare').on('shown.bs.modal', function() {
          $("#compareSlider").twentytwenty({
              slider_move: "mousemove"
          });
      });
      $("#login-form").submit(function(e) {
          $("#login-form input").removeClass("input_error");
          $.ajax({
              url: "/login-ajax",
              type: "POST",
              data: {
                  email: $("#login-form input[name=email]").val(),
                  password: $("#login-form input[name=password]").val(),
                  submit: 'login'
              },
              success: function(response, textStatus) {
                  var resp = JSON.parse(response);
                  if (typeof resp !== 'undefined') {
                      if (resp.Status == 'success') {
                          $('#loginModal').modal('hide');
                          $("button.dropzone-download-all").attr("title", "Download all images as a zip archive.");
                          $("#menu-signup").html('<a href="/menu">Admin</a>');
                          $("#menu-login").remove();
  
                          downloadAll();
                      } else if (resp.Status == 'error' || resp.Status == 'invalid') {
                          $("#login-form input[name=password]").attr('placeholder', resp.Message);
                          $("#login-form input[name=password]").val('');
                          if (resp.Status == 'invalid') {
                              $("#login-form input[name=email]").addClass("input_error");
                          } else {
                              $("#login-form input[name=password]").addClass("input_error");
                          }
                      }
                  }
              },
              error: function(jqXHR, textStatus, errorThrown) {}
          });
          e.preventDefault();
          return false;
      });
      var downloadAll = function() {
          var btn = $("button.dropzone-download-all");
          var aUrl = btn.data('url');
          if (typeof aUrl !== typeof undefined && aUrl !== false) {
              window.downloadFile(aUrl);
              return;
          }
          btn.html("Preparing ...");
          var optimized = $("a.optimized-download-active");
          var optimizedUrls = [];
          for (var i = 0; i < optimized.length; i++) {
              optimizedUrls[i] = $(optimized[i]).attr("href");
          }
          $.ajax({
              url: "/create-archive",
              type: "POST",
              data: {
                  "fileURLs": optimizedUrls
              },
              success: function(response, textStatus) {
                  var resp = JSON.parse(response);
                  if (typeof resp !== 'undefined') {
                      if (resp.Status == 'success') {
                          btn.data('url', resp.Url);
                          window.downloadFile(resp.Url);
                      } else if (resp.Status == 'login') {
                          $('#loginModal').modal('show');
                      } else if (resp.Status == 'credits') {
                          $("#credits-available").text(Math.max(0, resp.CreditsAvailable));
                          $('#creditsModal').modal('show');
                      }
                  }
                  btn.html("Download <span id='compresssed-file-count'>" + optimizedUrls.length + "</span> files");
              },
              error: function(jqXHR, textStatus, errorThrown) {
                  btn.html("Download " + optimizedUrls.length + " files");
              }
          });
      }
      $("button.dropzone-download-all").click(downloadAll);
   }
   var cssId = 'shortPixek';  // you could encode the css path itself to generate id..
   if (!document.getElementById(cssId))
   {
      var head  = document.getElementsByTagName('head')[0];
      var link  = document.createElement('link');
      link.id   = cssId;
      link.rel  = 'stylesheet';
      link.type = 'text/css';
      link.href = 'https://raw.githubusercontent.com/gk-git/sites-resources-overides/master/shortpixel.com/style.css';
      link.media = 'all';
      head.appendChild(link);
   }