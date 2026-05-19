var fs=require('fs');
var html=fs.readFileSync('/mnt/openclaw_home/.openclaw/workspace/中国象棋.html','utf8');
var clickB64=fs.readFileSync('/mnt/openclaw_home/.openclaw/workspace/tmp/click.wav').toString('base64');
var selectB64=fs.readFileSync('/mnt/openclaw_home/.openclaw/workspace/tmp/select.wav').toString('base64');

var insert="\n"+
"// 音效\n"+
"var _c=new Audio('data:audio/wav;base64,"+clickB64+"');\n"+
"var _s=new Audio('data:audio/wav;base64,"+selectB64+"');\n"+
"function sfx(cap){try{var a=cap?_s:_c;a.currentTime=0;a.play()}catch(e){}}\n";

var marker='draw();showToast(\'红方先行\');';
html=html.replace(marker, insert+marker);
fs.writeFileSync('/mnt/openclaw_home/.openclaw/workspace/中国象棋.html',html);
console.log('Written OK, size='+html.length);
