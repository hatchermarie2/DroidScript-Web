var fs = require('fs')
  , gm = require('gm').subClass({imageMagick: true});

var picture={path:"../DroidScript-Web/sdcard/ConexKeeper/photos/ConexKeeper2-100-20160927162738.jpgx", thumb_path: "thumb.jpg"};

gm(picture.path)
    .resize('64!', '64!', '^')
    .gravity('center')
    .extent(64, 64)
    .write(picture.thumb_path, function (error) {
       if(error) console.log(error.message);
});

// gm(picture.path).thumb('250!', '180!', picture.thumb_path, 100, function (error) {
//    if(error) console.log(error);
// });
