

// NOTE:
//
//  in most cases the maximum dimensions exceed 10,000 x 10,000 pixels,
//  iOS devices limit the canvas size to only 4,096 x 4,096 pixels
//  Exceeding the maximum dimensions or area renders the canvas unusable
//  — drawing commands will not work.




function detectMaxCanvasSizeOptimized() {
  let minSize = 116384; // Lower bound
  let maxSize = 1116384; // Upper bound, adjust based on assumptions
  let maxCanvasSize = 0;
  let testCanvas = document.createElement('canvas');
  let context = testCanvas.getContext('2d');

  while (minSize <= maxSize) {
    let midSize = Math.floor((minSize + maxSize) / 2);
    try {
      // Try to set canvas size to midpoint
      testCanvas.width = testCanvas.height = midSize;
      context.fillRect(0, 0, 1, 1); // Try to draw on the canvas

      if (testCanvas.width === midSize && testCanvas.height === midSize) {
        maxCanvasSize = midSize; // Update max size if successful
        minSize = midSize + 1; // Move lower bound up
      } else {
        // Size setting was not successful, adjust the upper bound
        maxSize = midSize - 1;
      }
    } catch (e) {
      // Catch any errors (e.g., memory issues), adjust the upper bound
      maxSize = midSize - 1;
    }
  }

  return maxCanvasSize;
}


function getMaxCanvasSize() {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  function testSize(size) {
      canvas.width = size;
      canvas.height = size;
      return canvas.width === size && canvas.height === size;
  }

  let low = 1;
  let high = 11132768;  // Start with a large size; 32768 is a common upper bound for canvas sizes in browsers
  let mid;

  while (low < high) {
      mid = (low + high + 1) >> 1;
      if (testSize(mid)) {
          low = mid;
      } else {
          high = mid - 1;
      }
  }

  return low;
}


// 5301552 ok  12994x408
//10602288 mal 25986x408

$(function(){
  trace(`DPR:${window.devicePixelRatio}`);

  //trace( getMaxCanvasSize() )
});

var DEBUG = false;


function trace(text){
  if(console) console.log(text);
  if(!trace.verbose) return;

  $("#trace")[0].innerHTML += "<div class='traceitem'>"+text+"</div>";
  $("#trace")[0].scrollTop = $("#trace")[0].scrollHeight;
}
trace.verbose = DEBUG;


var DEFAULT_IMAGE = "instructions.png";

///function GetRandomImageURL($topic='', $min=0, $max=100){
///  // get random image from Google
///  if ($topic=='') $topic='image';
///  $ofs=mt_rand($min, $max);
///  $geturl='http://www.google.ca/images?q=' . $topic . '&start=' . $ofs . '&gbv=1';
///  $data=file_get_contents($geturl);
 
///  $f1='<div id="center_col">';
///  $f2='<a href="/imgres?imgurl=';
///  $f3='&amp;imgrefurl=';
 
///  $pos1=strpos($data, $f1)+strlen($f1);
///  if ($pos1==FALSE) return FALSE;
///  $pos2=strpos($data, $f2, $pos1)+strlen($f2);
///  if ($pos2==FALSE) return FALSE;
///  $pos3=strpos($data, $f3, $pos2);
///  if ($pos3==FALSE) return FALSE;
///  return substr($data, $pos2, $pos3-$pos2);
///}
///function jsonFlickrApi(rsp) {
/// if (rsp.stat != "ok"){
///  return;
/// }
/// var s = "";
/// var i = Math.random();
/// i = i * 100;
/// i = Math.ceil(i);
/// photo = rsp.photos.photo[ i ];
/// t_url = "http://farm" + photo.farm +
/// ".static.flickr.com/" + photo.server + "/" +
/// photo.id + "_" + photo.secret + "_" + "m.jpg";
/// p_url = "http://www.flickr.com/photos/" +
/// photo.owner + "/" + photo.id;
/// s =  '<img alt="'+ photo.title + '"src="' + t_url + '"/>'  ;
/// document.writeln(s);
///}

//
//
//    * *    * * * *  * * * *  
//   *   *   *     *  *     *  
//  * * * *  * * * *  * * * *  
//  *     *  *        *        
//  *     *  *        *        
//
// 

var App = {};

//----------------------------------------------------- 
App.init = function(){
  this.history = [];
  App._crop = {};
  App._prevLoc = {x:0,y:0};
  App.zoom = 1;

  App.TOUCH_DEVICE = ( 
    navigator.userAgent.match(/iPhone|iPod|iPad|android|symbian/i) 
  );
  if(App.TOUCH_DEVICE) $("body").addClass("touch");

  $("#openFile").on("change", function(event){
    var files = event.target.files;
    for(var i = 0, file; file = files[i]; i++){
      if(!file.type.match('image.*')) continue;
      App.import(file);
    }
  });

  // ~ ~ ~ ~ ~ ~ crosshairs
  this.xLine = $("#content").append("<div id='xLine' class='crosshairs'>")[0].lastChild;
  this.yLine = $("#content").append("<div id='yLine' class='crosshairs'>")[0].lastChild;

  this.xCenter = $("#content").append("<div id='xCenter' class='centerLine'>")[0].lastChild;
  this.yCenter = $("#content").append("<div id='yCenter' class='centerLine'>")[0].lastChild;

  this.xLineCursor = $("#content").append("<div id='xLineCursor' class='lineCursor'>")[0].lastChild;
  this.yLineCursor = $("#content").append("<div id='yLineCursor' class='lineCursor'>")[0].lastChild;

  window.mouseX = window.mouseY = 0;

  this.flipper = new Flipper().attach( $("#content")[0] );

  // resize
  $(window).on("resize", function(){
    App.update();
    App.fitImage();
  });

  // ~ ~ ~ ~ ~ ~ overlay
  this.overlay = new Display().attach(document.body);
  var resizeOverlay = function(){
    this.overlay.canvas.width = $(window).width();
    this.overlay.canvas.height = $(window).height();
  }.bind(this);
  $(window).on("resize", resizeOverlay);
  resizeOverlay();


  $(window).on("pointermove", throttle( function(e){
    let event = e.originalEvent||e;
    ///if(event.pageX != mouseX && event.pageY != mouseY){ // stutters
      mouseX = event.pageX;
      mouseY = event.pageY;
      App._onMouseMove();
      App.update();
    ///}
  }, 10));
  $(window).on("pointerdown", App.onMouseDown.bind(this) );
  $(window).on("pointerup", App.onMouseUp.bind(this) );

  

  ///if(1||App.TOUCH_DEVICE){
  ///  $(content).on("pointerup", App.onMouseUp.bind(this) );
  ///  $(this.xLine).on("pointerup", App.onMouseUp.bind(this) );
  ///  $(this.yLine).on("pointerup", App.onMouseUp.bind(this) );
  ///}
  ///else{
  ///  $(content).on("pointerdown", App.onMouseUp.bind(this) );
  ///  $(this.xLine).on("pointerdown", App.onMouseUp.bind(this) );
  ///  $(this.yLine).on("pointerdown", App.onMouseUp.bind(this) );
  ///}

  var lastURL = App.storage("lastURL");
  if(lastURL) this.flipper.loadImage(lastURL, null, App._onLoad);
  else{
    this.flipper.loadImage(DEFAULT_IMAGE, null, App._onLoad);
  }

  App.setMode("left");

  // ui
  $("#ui,.menuItem").on("pointerenter", function(){
    $("body").addClass("ui");
  });
  $("#ui,.menuItem").on("pointerleave", function(){
    $("body").removeClass("ui");
  });

  $("#ui").on("pointerdown", function(event){
    event.stopPropagation();
  });
  $("#ui").on("pointerup", function(event){
    event.stopPropagation();
    App.flipping = false;
  });
  $("#closeImport").on("pointerdown", function(event){
    event.stopPropagation();
    App.showImport(false);
  });


  // ~ ~ ~ ~ ~ ~ menu

  // import
  $("#import").on("click", function(){
    App.showImport();
  });
  // load
  $("#load").on("click", function(){
    var value = $("#importui > input")[0].value;
    if(value) App.import(value);
  });
  // browse
  $("#browse").on("click", function(){
    App.browse();
  });
  // undo
  $("#undo").on("click", function(){
    App.undo(App.shiftKey);
  });
  // crop
  $("#crop").on("click", function(){
    App.crop();
  });
  // rotate
  $("#rotate").on("click", function(){
    App.rotate();
  });
  // automate
  $("#auto").on("click", function(){
    App.auto();
  });
  // export
  $("#export").on("click", function(){
    App.export();
  });

  // shift
  $("#shift").on("click", function(){
    App.shiftKey = !App.shiftKey;
    $(document.body).toggleClass("shiftKey",App.shiftKey);
    App.updateMenu();
  });
  // help
  $("#help").on("click", function(){
    $(document.body).toggleClass("help");
    App.updateMenu();
  });

  App._menuH = $("#menu").outerHeight();
  $("#ui").on("pointerenter", function(){
    App.showMenu(true);
  });
  $("#content").on("pointerover", function(){
    App.showMenu(false);
  });
  App.showMenu(false,0);

  // ~ ~ ~ ~ ~ ~ ~keys

  $(window).keydown(function(event){
    // can be confusing to have this toggle
    ///if(event.which==16) App.shiftKey = !App.shiftKey;
    if(event.which==16) App.shiftKey = event.shiftKey;

    App.ctrlKey = event.ctrlKey||event.metaKey;
    $(document.body).toggleClass("shiftKey",App.shiftKey);
    ///App.checkAutomated(App.shiftKey);
    App.updateMenu();
  }.bind(this));

  $(window).keyup(function(event){
    if(event.which==16) App.shiftKey = event.shiftKey;
    
    App.ctrlKey = event.ctrlKey||event.metaKey;

    $(document.body).toggleClass("shiftKey",App.shiftKey);

    ///App.checkAutomated(App.shiftKey);

    App.updateMenu();

    var key = event.which;
    event.stopPropagation();
    // z
    if(key == 90){
      $("#undo").trigger( "click" );
    }

    // SECURITY issue:
    ///// b, was i 73
    ///if(key == 66){
    ///  App.browse();
    ///}
    ///// u
    ///if(key == 85){
    ///  App.showImport(true);
    ///}
    // i 
    if(key == 73){
      $("#browse").trigger( "click" );
      ///App.browse();
    }
    // // // // //

    // c
    if(key == 67){
      $("#crop").trigger( "click" );
      ///App.crop();
    }
    // r
    if(key == 82 && !App.ctrlKey){
      $("#rotate").trigger( "click" );
      ///App.rotate();
    }
    // a
    if(key == 65 && !App.ctrlKey){
      $("#auto").trigger( "click" );
    }
    // esc
    if(event.keyCode == 27){
      App.showImport(false);
      App.flipping = false;
      App.setMode("none");
    }

  }.bind(this));

  $("#importui > input").keydown(function(event){
    event.stopPropagation();
    // enter
    if(event.which == 13){
      if(event.target.value) App.import(event.target.value);
    }
    // esc
    if(event.keyCode == 27){
      App.showImport(false);
    }
  }.bind(this));

  App.updateMenu();

}

//----------------------------------------------------- 
App.shift = function(state){
  if(state === App.shiftKey) return;
  App.shiftKey = state;
  $(document.body).toggleClass("shiftKey", App.shiftKey);
  App.updateMenu();
};


//----------------------------------------------------- 
App._onLoad = function(url, callback){
  App.storage("lastURL", url);
  App.history = [];
  App.history.push( {fn:"import", params:[url]} );
  App.fitImage();
  App.showImport(false);
  if(App._onLoadCallback){
    App._onLoadCallback();
    App._onLoadCallback = null;
  }
  App.setMode("none");
}

//----------------------------------------------------- 
function rnd(range){
  return ~~(Math.random()*range);
}
rnd.n = function(range, skew){
  if(range==null){
    trace("warning: rnd.n range is null");
    range = 100;
  }
  skew = skew||3;
  if(range<0) return -rnd.n(-range, skew);
  var n = 0;
  for(var i=0; i<skew; i++){
    n += Math.random();
  }
  n = ~~(range * (n / skew));
  return n;
};




//----------------------------------------------------- 
App.showImport = function(state){

  // SECURITY issue:
  // because of security issues, just support local files // // //
  if(state!==false) App.browse();
  return;
  // // // // //

  if(state==undefined) state = !$("#menu").hasClass("importOpen");
  var speed = 100;
  if(state){ // show
    $("#closeImport").fadeIn(speed);
    $("#importui").animate({
      left:50+"px",
    },speed);
    $("#importui > input").focus().select();
    $("#menu").addClass("importOpen");
    $(".crosshairs").hide();
    App._importOpen = true;
  }
  else{ // hide
    $("#closeImport").fadeOut(speed);
    $("#importui").animate({
      left:(-700)+"px",
    },speed);
    $("#menu").removeClass("importOpen");
    $("#importui > input").blur();
    $(".crosshairs").show();
    App._importOpen = false;
  }

}
//----------------------------------------------------- 
App.browse = function(){
  App._onLoadCallback = App.updateMenu;
  $("#openFile").click();
}
//----------------------------------------------------- 
App.import = function(path){
  App.flipper.loadImage(path, null, App._onLoad);
}
//----------------------------------------------------- 
App.export = function(){
  if(App.history.length<2) return;
  var dataURL = App.flipper.canvas.toDataURL("image/png");
  $("#export").attr("href",dataURL);

  /// // subtract ms since 2020 from date now
  /// var d = (new Date("2020-01-01")).getTime();
  /// //2000=946684800000  2020=1577836800000
  // seconds since 2020-01-01
  var d = (Math.round((Date.now()-1577836800000)/1000))
          .toString(36).toUpperCase();
  var a = App.automated?"a":"";
  var fileName = "flippory"+d+a+".png";
  $("#export").attr("download",fileName);
}
//----------------------------------------------------- 
App.undo = function(automated){
  if(this.history.length<2) return;
  if(automated){
    // step back to last "automated"
    var i = this.history.lastIndexOf("automated");
    if(i==-1) return;
    this.history = this.history.slice(0,i);
    i = this.history.lastIndexOf("automated");
    if(i==-1){
      App.automated = false;
      $("body").toggleClass("automated", App.automated);
    }
  }
  else{
    this.history.pop();
  }
  this.replay();
  App.updateMenu();
};
///App.checkAutomated = function(shiftKey){
///  return this.history.lastIndexOf("automated") != -1;
///};
//----------------------------------------------------- 
App.crop = function(){
  App.setMode("crop");
  App.updateMenu();
}
//----------------------------------------------------- 
App.rotate = function(){
  App.history.push( {fn:"rotate", params:[App.shiftKey]} );
  App.flipper.rotate(App.shiftKey);
  App.updateMenu();
  App.fitImage();
}
//----------------------------------------------------- 
App.replay = function(){
  var next = function(item, index){
    App.fitImage();

    if(!item){
      App.history = history;
      return;
    }
    
    switch(item.fn){
      case "import":
        App.flipper.loadImage.call(App.flipper, item.params[0], null, function(){
          next(steps.shift());
        });
        break;
      case "reflect":
        App.flipper.reflect.apply(App.flipper, item.params);
        next(steps.shift());
        break;
      case "crop":
        App.flipper.crop.apply(App.flipper, item.params);
        next(steps.shift());
        break;
      case "rotate":
        App.flipper.rotate.apply(App.flipper, item.params);
        next(steps.shift());
        break;
      default:
        next(steps.shift());
    }
  };

  var history = App.history.slice(0);
  var steps = App.history.slice(0);
  next(steps.shift());
}
//----------------------------------------------------- 
App.updateMenu = function(){
  var noHistory = (this.history.length<2);
  var noAuto = this.history.lastIndexOf("automated") == -1;
  var undoDisabled = noHistory || (App.shiftKey && noAuto);
  $("#undo").toggleClass("disabled", undoDisabled );
  $("#export").toggleClass("disabled", noHistory);
}
//----------------------------------------------------- 
App.showMenu = function(state, speed){
  ///speed = speed===undefined?200:speed;
  ///if(state){
  ///  $("#ui").animate({
  ///    top:0,
  ///    opacity:1,
  ///    paddingBottom:"20px"
  ///  },speed);
  ///}
  ///else{
  ///  $("#ui").animate({
  ///    top:(-App._menuH+14)+"px",
  ///    opacity:1,//.3,
  ///    paddingBottom:"160px"
  ///  },speed);
  ///}
}
//----------------------------------------------------- 
App.onMouseDown = function(event){
  App.flipping = false;

  // only left click - why?
  if(event.which != 1) return;

  let e = event.originalEvent||event;
  mouseX = e.pageX;
  mouseY = e.pageY;
  
  var loc = App.globalToLocal(mouseX,mouseY);

  var w = App.flipper.canvas.width;
  var h = App.flipper.canvas.height;
  var m = 5;
  loc.x = Math.max(m,Math.min(loc.x, w-1));
  loc.y = Math.max(m,Math.min(loc.y, h-1));

  // crop
  if(App.mode=="crop"){
    if(App._cropping){
      App._updateCropRect();
    }
    else{
      App._updateCropRect("begin");
    }
  }
  // needed for NON- App.TOUCH_DEVICE 
  else if(App.mode=="left" || App.mode=="top"){
    App.flipping = true;
    App.shift(false);
  }

}


//----------------------------------------------------- 
App.onMouseUp = function(event){
  // only left click
  if(event.which != 1) return;

  let e = event.originalEvent||event;
  mouseX = e.pageX;
  mouseY = e.pageY;

  var loc = App.globalToLocal(mouseX,mouseY);

  var w = App.flipper.canvas.width;
  var h = App.flipper.canvas.height;

  if(DEBUG){
    var parent = App.flipper.canvas.parentNode;
    trace(`\n*** ${w}x${h} / ${parent.offsetWidth}x${parent.offsetHeight}`);
    trace(`\n    ${w/h} / ${parent.offsetWidth/parent.offsetHeight}`);
  }
  var m = 5;

  loc.x = Math.max(m,Math.min(loc.x, w-1));
  loc.y = Math.max(m,Math.min(loc.y, h-1));

  // ~ ~ ~ mode

  // crop
  if(App.mode=="crop"){
    App._updateCropRect("end");
  }
  // reflect left/top
  else if(App.flipping){
    var mode,offset;
    if(App.mode=="left"){
      mode = "left";
      offset = loc.x;
    }
    else{
      mode = "top";
      offset = loc.y;
    }
    App.reflect(mode, offset);
    ///App.flipper.reflect(mode, offset);
    ///App.history.push( {fn:"reflect", params:[mode, offset]} );
  }

  App.fitImage();
  App.updateMenu();
  App.setMode("none");
  ///App.update();

  App.flipping = false;
};
//----------------------------------------------------- 
App.reflect = function(mode, offset){
  offset = Math.round(offset);
  App.flipper.reflect(mode, offset );
  App.history.push( {fn:"reflect", params:[mode, offset]} );
};
//----------------------------------------------------- 
App.fitImage = function(){
  var $canvas = $(App.flipper.canvas);
  var W = $(".Flipper").width();
  var H = $(".Flipper").height();
  var w = App.flipper.canvas.width;
  var h = App.flipper.canvas.height;

  App.zoom = Math.min( 1,Math.min(H/h,W/w) );

  if(w > W) $canvas.css({width:w * App.zoom});
  else $canvas.css({width:"auto"});
  if(h > H) $canvas.css({height:h * App.zoom});
  else $canvas.css({height:"auto"});
}
///App.fitImage = function(){
///  var $canvas = $(App.flipper.canvas);
///  var W = $(window).width();
///  var H = $(window).height();
///  var w = App.flipper.canvas.width;
///  var h = App.flipper.canvas.height;
///
///  App.zoom = Math.min( 1,Math.min(H/h,W/w) );
///
///  if(w > W) $canvas.css({width:w * App.zoom});
///  else $canvas.css({width:"auto"});
///  if(h > H) $canvas.css({height:h * App.zoom});
///  else $canvas.css({height:"auto"});
///}
//----------------------------------------------------- _onMouseMove
App._onMouseMove = function(){
  // ~ ~ ~ crop
  if(App.mode == "crop"){
    if(App._cropping) App._updateCropRect();
    return;
  }

  // ~ ~ ~ reflect
  // start moving
  if(!App._mouseMoving){
    App._prevLoc = {x:mouseX,y:mouseY};
    App._newDir = null;
    ///$("#debug1").css({left:App._prevLoc.x+"px",top:App._prevLoc.y+"px"}); // DEBUG
    ///$("#debug2").css({left:-100+"px",top:-100+"px"}); // DEBUG
  }
  // while moving
  else{
    clearTimeout(App._mouseMoving);
    // have not found new direction
    if(!App._newDir){
      // distance > n
      var cur = {x:mouseX,y:mouseY}, prev = App._prevLoc;
      var dx = cur.x - prev.x, dy = cur.y - prev.y;
      var dist = Math.sqrt( dx*dx + dy*dy );
      if(dist>30){
        var dir = App._newDir = App.getMouseDir(cur.x,cur.y);
        ///$("#debug2").css({left:cur.x+"px",top:cur.y+"px"}); // DEBUG
        ///this.overlay.remove(this._directionLine);
        ///this._directionLine = this.overlay.addLine(prev.x,prev.y,cur.x,cur.y,"#000", "#fff",3);
        if(dir && App.mode!="ui"){
          var D = dir;
          dir = dir=="left"||dir=="right"?"left":"top";
          App.setMode(dir);

          // for App.TOUCH_DEVICE only
          if(App.TOUCH_DEVICE && (App.mode=="left" || App.mode=="top")){
            App.flipping = true;
            App.shift(false);
          }
        }
      }
    }
  }
  // stop moving
  App._mouseMoving = setTimeout(function(){
    App._mouseMoving = null;
  }, 100);
}

App.MINIMUM_REFLECT_SIZE = 5;

//----------------------------------------------------- 
App._updateCropRect = function(state){
  // ~ ~ ~ begin
  if(state=="begin"){
    if(App._crop.rect) this.overlay.remove(App._crop.rect);
    App._crop.mouseX1 = mouseX;
    App._crop.mouseY1 = mouseY;
    App._cropping = true;
    $("body").addClass("cropping");
  }

  // ~ ~ ~ while
  var $canvas = $(App.flipper.canvas);
  var offset = $canvas.offset();

  // canvas
  var left = Math.round(offset.left);
  var top = Math.round(offset.top);
  var width = $canvas.width();
  var height = $canvas.height();
  // crop
  var x1 = App._crop.mouseX1;
  var y1 = App._crop.mouseY1;
  var x2 = mouseX;
  var y2 = mouseY;

  // normalize
  if(x2<x1){
    var temp = x2;
    x2 = x1;
    x1 = temp;
  }
  if(y2<y1){
    var temp = y2;
    y2 = y1;
    y1 = temp;
  }
  var margin = App.MINIMUM_REFLECT_SIZE;
  x1 = within(x1, left, left+width-margin);
  y1 = within(y1, top, top+height-margin);
  x2 = within(x2, left+margin, left+width);
  y2 = within(y2, top+margin, top+height);

  // w & h -1 because the crop rect is not inclusive with coords x2,y2
  var w = x2-x1-1, h = y2-y1-1;
  w = within(w, 5, width);
  h = within(h, 5, height);

  this.overlay.remove(App._crop.rect);
  App._crop.rect = this.overlay.addRect(x1, y1, w, h, 
    "#0cd", "rgba(0,255,255,.2)");

  // ~ ~ ~ end
  if(state=="end"){
    var cropW = App._crop.rect.w /= App.zoom;
    var cropH = App._crop.rect.h /= App.zoom;
    var p1 = App.globalToLocal(App._crop.rect.x, App._crop.rect.y);
    var p2 = {x:cropW+p1.x+1, y:cropH+p1.y+1};

    App.flipper.crop(p1.x, p1.y, p2.x, p2.y);
    App.history.push( {fn:"crop", 
      params:[p1.x, p1.y, p2.x, p2.y]} );
    // cleanup
    App._stopCropping();
    return;
  }
}
//----------------------------------------------------- 
App._stopCropping = function(){
  this.overlay.remove(App._crop.rect);
  App._crop = {};
  App.setMode("none");
  $("body").removeClass("cropping");
  App._cropping = false;
}


//----------------------------------------------------- 
App.getMouseDir = function(x,y){
  var prev = App._prevLoc;

  // direction
  var radians = Math.atan2( x - prev.x, y - prev.y );
  var degrees = ( radians * (180 / Math.PI) ) + 180;
  degrees = (degrees+90)%360;

  var dir = Math.round(degrees / 90) % 4;

  return (["left","bottom","right","top"])[dir];
}

//----------------------------------------------------- 
App.update = function(){
  var x = mouseX;// - ~~(this.xLine.offsetWidth/2);
  var y = mouseY;// - ~~(this.yLine.offsetHeight/2);

  if(App.mode=="crop"){
    this.xLine.style.left = x+"px";
    this.yLine.style.top = y+"px";
  }
  else{
    var canvas = App.flipper.canvas;
    var margin = App.MINIMUM_REFLECT_SIZE;
    var L = $(canvas).offset().left+margin;
    var T = $(canvas).offset().top+margin;
    this.xLine.style.left = Math.max(x,L)+"px";
    this.yLine.style.top = Math.max(y,T)+"px";
  }

  // 26x18
  this.xLineCursor.style.left = (x)+"px";
  this.xLineCursor.style.top = (y-9)+"px";
  this.yLineCursor.style.left = (x-9)+"px";
  this.yLineCursor.style.top = (y)+"px";


  //////var loc = App.globalToLocal(x,y);
  ///var dir = App.getMouseDir(x,y);
  ///if(dir && App.mode!="ui"){
  ///  dir = dir=="left"||dir=="right"?"left":"top";
  ///  App.setMode(dir);
  ///}
}
//----------------------------------------------------- 
App.setMode = function(mode){
  var wasMode = App.mode;
  $("body").removeClass(wasMode);
  App.mode = mode;
  $("body").addClass(App.mode);

  // cleanup incase mouseup was skipped or esc pressed
  if(wasMode == "crop" && App._crop.rect){
    App._stopCropping();
  }
}
//----------------------------------------------------- 
App.download = function(){
  // <a href="your-data-uri" download="filename.txt">
}

//----------------------------------------------------- 
App.globalToLocal = function(x, y, element){
  if(!element) element = App.flipper.canvas;
  var offset = $(element).offset();
  var L = offset.left;
  var T = offset.top;
  return { x:(x - L) / App.zoom, y:(y - offset.top) / App.zoom };
}
var L = App.globalToLocal;

//----------------------------------------------------- 
App.storage = function(key, _value){
  if(_value!==undefined){ // export
    localStorage[key] = JSON.stringify(_value);
  }
  else{                   // load
    _value = localStorage[key];
    if(_value!==undefined) _value = JSON.parse(_value);
    return _value;
  }
}













// ////////////////////////////////////////////////////

//   * * * *  *        *  * * * *  * * * *  * * * *  * * * *  
//   *        *        *  *     *  *     *  *        *     *  
//   * * * *  *        *  * * * *  * * * *  * * * *  * * * *  
//   *        *        *  *        *        *        *  *     
//   *        * * * *  *  *        *        * * * *  *   *    

// ////////////////////////////////////////////////////

//----------------------------------------------------- 
function Flipper(){
  this.body = document.createElement("div");
  this.body.className = "Flipper";
  this.body.component = this;

  this.frame = document.createElement("div");
  $(this.body).append(this.frame);

  this.canvas = document.createElement("canvas");
  $(this.frame).append(this.canvas);
  this.context = this.canvas.getContext("2d");
  this.image = new Image();
  $(this.image).on("load", function(){
    var w = this.canvas.width = this.image.width;
    var h = this.canvas.height = this.image.height;
    this.context.drawImage(this.image, 0, 0, w, h);
  }.bind(this) );
  this.redo = [];
}
//----------------------------------------------------- 
Flipper.prototype.reflect = function(side, offset){
  trace("reflect "+side+" at "+offset);
  var w = this.canvas.width, 
      h = this.canvas.height, 
      dimension, offsetX, offsetY;

  dimension = (side=="left") ? w:h;

  if(offset==undefined) offset = "80%";
  if(typeof offset == "string"){
    offset = parseFloat(offset);
    offset = dimension * (offset/100);
  }

  offset = ~~Math.max(0,Math.min(offset, dimension));

  if(side=="left"){
    offsetX = offset;
    offsetY = this.canvas.height;
    dimension = w = offsetX*2;
  }
  else if(side=="top"){
    offsetX = this.canvas.width;
    offsetY = offset;
    dimension = h = offsetY*2;
  }

  // copy current image to buffer
  var prevImage = this.copy(this.canvas);

  // resize
  this.canvas.width = w;
  this.canvas.height = h;

  // copy buffer to canvas
  this.context.drawImage(prevImage, 0, 0, prevImage.width, prevImage.height);
  if(side=="left"){
    this.context.translate(w, 0);
    this.context.scale(-1,1);
  }
  else{
    this.context.translate(0, h);
    this.context.scale(1,-1);
  }
  this.context.clearRect(0, 0, offsetX, offsetY);
  this.context.drawImage(prevImage, 0, 0, offsetX, offsetY, 0, 0, offsetX, offsetY);

  return this;
}
//----------------------------------------------------- 
Flipper.prototype.copy = function(from, to){
  if(!to) to = document.createElement("canvas");
  if(from){
    var w = to.width = from.width;
    var h = to.height = from.height;
    to.context = to.getContext("2d");
    to.context.drawImage(from, 0, 0, w, h);
  }
  return to;
}
//----------------------------------------------------- 
Flipper.prototype.crop = function(x1,y1,x2,y2){
  x1 = Math.round(x1);
  x2 = Math.round(x2);
  y1 = Math.round(y1);
  y2 = Math.round(y2);
  trace("crop "+[x1,y1,x2,y2]);
  var temp;
  if(x1>x2){
    temp = x1;
    x1 = x2;
    x2 = temp;
  }
  if(y1>y2){
    temp = y1;
    y1 = y2;
    y2 = temp;
  }

  var w = x2 - x1, h = y2 - y1;

  // keep within image
  x1 = Math.max(0,x1);
  y1 = Math.max(0,y1);
  w = Math.min(this.canvas.width-x1,w);
  h = Math.min(this.canvas.height-y1,h);

  // copy curent image to buffer
  var prevImage = this.copy(this.canvas);
  // resize
  this.canvas.width = w;
  this.canvas.height = h;
  // copy buffer to canvas
  this.context.drawImage(prevImage, x1, y1, w, h, 0, 0, w, h);
}
//----------------------------------------------------- 
Flipper.prototype.rotate = function(counterclockwise){
  trace("rotate "+(counterclockwise?"CCW":"CW"));
  var direction = counterclockwise?-1:1;
  // copy curent image to buffer
  var prevImage = this.copy(this.canvas);
  // resize
  var w = this.canvas.width = prevImage.height;
  var h = this.canvas.height = prevImage.width;
  // copy buffer to canvas rotated

  ///this.context.save();

  ///this.context.rotate(  toRadians(90) );
  this.context.rotate(  Math.PI/2 * direction );
  if(direction==1) this.context.translate(0,-w);
  else this.context.translate(-h,0);
  this.context.drawImage(prevImage, 0,0);

  ///this.context.restore();
}

//----------------------------------------------------- 
Flipper.prototype.loadImage = function(fileOrURL, callback, onImageLoad){
  $(this.image).on("load", function(url){
    onImageLoad(this.src);
  });
  this.image.src = " ";
  if(typeof fileOrURL == "object"){
    var reader = new FileReader();
    reader.onload = function(event){
      this.image.src = event.target.result;
      if(callback) callback(event.target.result);
    }.bind(this);
    try{
      reader.readAsDataURL(fileOrURL);
    }catch(error){ trace(error,"error"); }
  }
  else{
    this.image.src = fileOrURL;
    if(callback) callback(fileOrURL);
  }
}
//----------------------------------------------------- 
Flipper.prototype.attach = function(parent){
  parent.appendChild(this.body);
  return this;
}



///////////////////////////////////////////////////////

////////  *     *
////////  *     *
////////  *     *
////////  *     *
////////   * * *     

///////////////////////////////////////////////////////

//----------------------------------------------------- 
// "%s big %s".substitute("hello", "world") == "hello big world"
String.prototype.sub = String.prototype.substitute = function(){  
  var result = this;
  for(var i=0, len=arguments.length ; i<len; i++){
    result = result.replace(/%s/, arguments[i]);
  }  
  return result;
};


//----------------------------------------------------- 
function loop(n, fn, t, _i, _max){
  _i = _i||0;
  _max = _max||n;
  fn(_i,_max);    
  if(--n) setTimeout(loop.bind(this, n, fn, t, ++_i, _max), t||0);
}


//----------------------------------------------------- 
function throttle(fn, timeout){
  var lastTime = 0;
  return function(){
    if(Date.now()-lastTime >= timeout){
      lastTime = Date.now();
      return fn.apply(this, arguments);
    }
  }
}

//----------------------------------------------------- 
function within(value, min, max){
  return Math.max(min, Math.min(value, max));
}

//----------------------------------------------------- 
function toRadians(degrees){
  return degrees * (Math.PI / 180);
}
//----------------------------------------------------- 
function toDegrees(radians){
  return radians * (180 / Math.PI);
}


/////----------------------------------------------------- 
///function throttle(fn, timeout){
///  var lastTime = 0, nextCall;
///  return function(){
///    if(nextCall) return;

///    var now = Date.now();
///    var elapsed = now-lastTime;
///    var args = arguments;

///    nextCall = setTimeout(function(){
///      lastTime = Date.now();
///      nextCall = null;
///      fn.apply(this, args);
///    }, Math.max(0, timeout - elapsed) );
///  }
///}

// ////////////////////////////////////////////////////

// /////  * * * *
// /////   *      *
// /////   *      *
// /////   *      *
// /////  * * * *  

// ////////////////////////////////////////////////////

//----------------------------------------------------- 
function Display(fn){
  this.canvas = document.createElement("canvas");
  this.canvas.className = "Display";
  this.canvas.context = this.canvas.getContext("2d");
  this.canvas.onresize = throttle(function(event){
    this.update();
  }.bind(this), 50);

  if(fn) this._draw = fn;
  this.shapes = [];
}
Display._id = 0;
//----------------------------------------------------- 
Display.prototype.update = function(){
  var ctx = this.canvas.context, canvas = this.canvas;

  ctx.lineWidth = 1;

  ctx.clearRect(0,0,canvas.width,canvas.height);
  this.shapes.forEach(function(shape){
    switch(shape.type){
      case "line":
        ctx.strokeStyle = shape.stroke;
        ctx.drawLine(~~shape.x,~~shape.y, ~~shape.x2,~~shape.y2, shape.dashLen, shape.fill);
        break;
      case "rect":
        if(shape.fill){
          ctx.fillStyle = shape.fill;
          // +.5 is nec. to get an aliased line
          ctx.fillRect(shape.x+.5, shape.y+.5, shape.w-0, shape.h-0);
        }
        if(shape.stroke){
          ctx.strokeStyle = shape.stroke;
          ctx.strokeRect(shape.x+.5, shape.y+.5, shape.w-0, shape.h-0);
        }
        break;
    }

  }.bind(this));
  return this;
}
//----------------------------------------------------- 
Display.prototype.attach = function(parent){
  parent.appendChild(this.canvas);
  return this;
}
//----------------------------------------------------- 
Display.prototype.addLine = function(x, y , x2, y2, stroke, fill, dashLen){
  var shape = { id:Display._id++, type:"line", stroke:stroke, fill:fill,
               x:x, y:y, x2:x2, y2:y2, dashLen:dashLen };
  this.shapes.push(shape);
  this.update();
  return shape;
}
//----------------------------------------------------- 
Display.prototype.addRect = function(x, y , w, h, stroke, fill){
  var shape = { id:Display._id++, type:"rect", stroke:stroke, fill:fill, 
               x:x, y:y, w:w, h:h };
  this.shapes.push(shape);
  this.update();
  return shape;
}
//----------------------------------------------------- 
Display.prototype.remove = function(shape){
  if(!shape) return;
  for(var i=0, len=this.shapes.length; i<len; i++){
    var cur = this.shapes[i];
    if(cur.id == shape.id){
      this.shapes.splice(i,1);
      break;
    }
  }
  this.update();
}

// dashedLine code modified from:
// http://vetruvet.blogspot.com/2010/10/drawing-dashed-lines-on-html5-canvas.html
CanvasRenderingContext2D.prototype.drawLine = function(x1, y1, x2, y2, dashLen, fill){
  if(!dashLen || fill){
    this.beginPath();
    this.moveTo(x1, y1);
    this.lineTo(x2, y2);
    if(fill){
      this.export();
      this.strokeStyle = fill;
      this.stroke();
      this.restore();
    }
    else this.stroke();
    this.closePath();
  }
  if(dashLen){
    this.beginPath();
    this.moveTo(x1, y1);
    var dX = x2 - x1;
    var dY = y2 - y1;
    var dashes = Math.floor(Math.sqrt(dX * dX + dY * dY) / dashLen);
    var dashX = dX / dashes;
    var dashY = dY / dashes;
    var q = 0;
    while (q++ < dashes) {
      x1 += dashX;
      y1 += dashY;
      this[q % 2 == 0 ? 'moveTo' : 'lineTo'](x1, y1);
    }
    this[q % 2 == 0 ? 'moveTo' : 'lineTo'](x2, y2);
    this.stroke();
    this.closePath();
  }
};

///// from:
///// http://stackoverflow.com/questions/4261090/html5-canvas-and-anti-aliasing
///function __dist(x1,y1,x2,y2) {
///  return Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1));
///}
///// finds the angle of (x,y) on a plane from the origin
///function __getAngle(x,y) { return Math.atan(y/(x==0?0.01:x))+(x<0?Math.PI:0); }
///// the function
///function drawLineNoAliasing(ctx, sx, sy, tx, ty) {
///    var dist = __dist(sx,sy,tx,ty); // length of line
///    var ang = __getAngle(tx-sx,ty-sy); // angle of line
///    for(var i=0;i<dist;i++) {
///        // for each point along the line
///        ctx.fillRect(Math.round(sx + Math.cos(ang)*i), // round for perfect pixels
///                     Math.round(sy + Math.sin(ang)*i), // thus no aliasing
///                     1,1); // fill in one pixel, 1x1
///    }
///}



App.printHistory = function(){
  var out = "";
  for(var i=0, len=App.history.length; i<len; i++){
    var item = App.history[i];
    if(typeof item == "object"){
      if(item.fn == "import"){
        out += "import " + item.params[0].substr(0,55) + "...";
      }
      else{
        out += item.fn + " " + item.params.join(",");
      }
    }
    else{
      out += item
    }
    out += "\n";
  }
  return out;
};

//     * *    *     *  * * * *  * * * *  
//    *   *   *     *     *     *     *  
//   * * * *  *     *     *     *     *  
//   *     *  *     *     *     *     *  
//   *     *  * * * *     *     * * * *  


//= = = = = = = = = = = = = = = = = = = = = = = = = = = ~auto
///App.auto = function(){
///  App.history.push( {fn:"auto", params:[]} );
///
///  var STEPS = 5;
///
///  var canvas = App.flipper.canvas;
///  var orgW = canvas.width;
///  var orgH = canvas.height;
///  for(var i=0; i<STEPS; i++){
///    App.auto.step(orgW, orgH);
///  }
///
///  if(App.auto.perfect){
///    App.flipper.reflect("left", ~~(canvas.width/2));
///    App.flipper.reflect("top", ~~(canvas.height/2));
///  }
///
///  App.fitImage();
///  App.updateMenu();
///  App.setMode("none");
///};
App.auto = function(){
  App.history.push( "automated" );

  App.automated = true;
  $("body").toggleClass("automated", App.automated);

  var STEPS = Math.max(3,rnd(5)+rnd(5)+rnd(5)); // 5 10


  ///trace.verbose=true;
  ///trace(STEPS+" STEPS");
  ///trace.verbose=!true;

  var canvas = App.flipper.canvas;
  var orgW = canvas.width;
  var orgH = canvas.height;
  var t = 0, d = 0;//300; 
  for(var i=0; i<STEPS; i++){
    App.auto.setTimeout(function(){
      App.auto.step(orgW, orgH);
    }, t);
    t += d;
  }

  if(App.auto.perfect){
    App.auto.setTimeout(function(){
      App.auto.reflect("left", ~~(canvas.width/2));
      App.auto.reflect("top", ~~(canvas.height/2));
      App.fitImage();
      App.updateMenu();
      App.setMode("none");
    }, t);
  }

  App.auto.setTimeout(function(){
    App.history.push( "automated-end" );
  }, t);

};

// no delay
App.auto.setTimeout = function(fn, t){
  if(t==0) return fn();
  return setTimeout(fn, t);
}

// want history
App.auto.rotate = App.rotate;
App.auto.reflect = App.reflect;
App.auto.crop = function(x1, y1, x2, y2){
  App.flipper.crop(x1, y1, x2, y2);
}
// no history
///App.auto.rotate = function(){App.flipper.rotate()};
///App.auto.reflect = function(a,b){App.flipper.reflect(a,b)};
///App.auto.crop = function(a,b,c,d){App.flipper.crop(a,b,c,d)};

// finalize by reflecting H & V on center
App.auto.perfect = true;

//- - - - - - - - - - - - - - - - - - - - - - - - - - - 
App.squareness = function(w,h){
  if(w<h){
    return w/h;
  }
  else{
    return h/w;
  }
};
///App.size = function(w,h){
///  return Math.sqrt(w+h);
///}
//= = = = = = = = = = = = = = = = = = = = = = = = = = = 
App.auto.step = function(orgW, orgH){
  var mode, offset;

  var canvas = App.flipper.canvas;

  var orgSz = Math.sqrt(orgW + orgH);
  var sz = Math.sqrt(canvas.width+canvas.height);

  while(canvas.width<orgW*.5){
    trace("THINW");
    App.auto.reflect("left", canvas.width);
  }
  while(canvas.height<orgH*.5){
    trace("THINH");
    App.auto.reflect("top", canvas.height);
  }
  var squareness = App.squareness(canvas.width,canvas.height);
  if(squareness<.5){
    trace("THIN");
    if(canvas.height<canvas.width){
      App.auto.rotate();
    }
    offset = canvas.width;
    App.auto.reflect("left", offset);
  }

  // rotate
  if(rnd(2)==1){
    App.auto.rotate();
  }
  // rotate
  if(rnd(2)==1){
    App.auto.rotate();
  }
  // rotate
  if(rnd(2)==1){
    App.auto.rotate();
  }
  // flip
  App.flipping = true;
  if(rnd(2)){
    mode = "left";
    offset = rnd.n(canvas.width);
  }
  else{
    mode = "top";
    offset = rnd.n(canvas.height);
  }
  trace("reflect mode "+mode+" offset "+offset);
  App.auto.reflect(mode, offset);



  // crop
  var N = 1.5;
  ///if(canvas.width>orgW*2 || canvas.height>orgH*2 || rnd(20)==1){
  var forceCrop = rnd(20)==1;
  if(sz>orgSz*N || forceCrop){
    if(forceCrop) trace("FORCECROP");
    else trace("CROP sz "+sz +", orgSz "+orgSz);

    // v1
    ///var x1, y1, x2, y2;
    ///x1 = rnd.n(App.flipper.canvas.width);
    ///x2 = x1 + rnd.n(App.flipper.canvas.width-x1);
    ///y1 = rnd.n(App.flipper.canvas.height);
    ///y2 = y1 + rnd.n(App.flipper.canvas.height-y1);
    ///App.flipper.crop(x1, y1, x2, y2);
    ///if(forceCrop){
    ///  App.auto.reflect("left", canvas.width);
    ///  App.auto.reflect("top", canvas.height);
    ///}
    ///else{
    ///  App.auto.reflect("left", ~~(canvas.width/2));
    ///  App.auto.reflect("top", ~~(canvas.height/2));
    ///}

    // v2
    var minW = ~~(orgW * .25);
    var cropW = Math.max(rnd(canvas.width), minW);
    var minH = ~~(orgH * .25);
    var cropH = Math.max(rnd(canvas.height), minH);
    var x1, y1, x2, y2;
    x1 = rnd.n(canvas.width-cropW);
    x2 = x1 + cropW;
    y1 = rnd.n(canvas.height-cropW);
    y2 = y1 + cropH;
    App.auto.crop(x1, y1, x2, y2);

  }
};
///App.auto.step1 = function(){
///  ///// crop
///  ///if(false){
///  ///  App.mode = "crop";
///  ///  App.flipping = false;
///  ///}
///  // rotate
///  if(rnd(2)==1){
///    App.auto.rotate();
///  }
///  // rotate
///  if(rnd(2)==1){
///    App.auto.rotate();
///  }
///  // rotate
///  if(rnd(2)==1){
///    App.auto.rotate();
///  }
///  // flip
///  App.flipping = true;
///  var mode, offset;
///  if(rnd(2)){
///    mode = "left";
///    offset = rnd.n(App.flipper.canvas.width);
///  }
///  else{
///    mode = "top";
///    offset = rnd.n(App.flipper.canvas.height);
///  }
///  trace("reflect mode "+mode+" offset "+offset);
///  App.auto.reflect(mode, offset);
///};




///////////////////////////////////////////////////////

////////  *       *
////////  * *   * *
////////  *   *   *
////////  *       *
////////  *       *

///////////////////////////////////////////////////////

//----------------------------------------------------- on load
$(function(){
  App.init();
});
