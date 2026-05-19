var fs=require('fs');
var html=fs.readFileSync('/mnt/openclaw_home/.openclaw/workspace/中国象棋.html','utf8');
var js=html.match(/<script>([\s\S]*?)<\/script>/)[1];

js=js.replace(/const CELL=56, OFFSET_X=28, OFFSET_Y=24;\s*/,'');
js=js.replace(/const canvas=document\.getElementById\('board'\);\s*/,'');
js=js.replace(/const turnSpan=document\.getElementById\('turnIndicator'\);\s*/,'');
js=js.replace(/const statusSpan=document\.getElementById\('statusText'\);\s*/,'');
js=js.replace(/const toastEl=document\.getElementById\('toast'\);\s*/,'');
js=js.replace(/const BD_W=CELL\*8\+OFFSET_X\*2, BD_H=CELL\*9\+OFFSET_Y\*2;\s*/,'');

var stubs='\n'+
'var canvas={getContext:function(){return{clearRect:function(){},save:function(){},restore:function(){},fillRect:function(){},beginPath:function(){},moveTo:function(){},lineTo:function(){},stroke:function(){},fill:function(){},fillText:function(){},arc:function(){},strokeRect:function(){},createRadialGradient:function(){return{addColorStop:function(){}}},createLinearGradient:function(){return{addColorStop:function(){}}}}},width:1,height:1};\n'+
'var turnSpan={textContent:""};\n'+
'var statusSpan={textContent:""};\n'+
'var toastEl={textContent:"",classList:{add:function(){},remove:function(){}},_tm:null};\n'+
'var CELL=56,OFFSET_X=28,OFFSET_Y=24,BD_W=504,BD_H=552;\n'+
'var document={getElementById:function(){return{addEventListener:function(){},textContent:"",classList:{add:function(){},remove:function(){}}}},querySelectorAll:function(){return{forEach:function(){}}}};\n'+
'var clearTimeout=function(){};\n'+
'var performance={now:function(){return Date.now();}};\n'+
'var setTimeout=function(fn,ms){fn();return 1;};\n';

var test='\n'+
'try{\n'+
"console.log('=== Board basic test ===');\n"+
'var b=new Board();\n'+
"console.log('Turn:',b.turn,'(0=RED)');\n"+
'var rM=b.allLegal(RED);\n'+
"console.log('RED legal moves:',rM.length);\n"+
'if(rM.length) console.log("Sample:",JSON.stringify(rM.slice(0,3)));\n'+
"console.log('BLACK legal moves:',b.allLegal(BLACK).length);\n"+
"console.log('inCheck RED:',b.inCheck(RED),'BLACK:',b.inCheck(BLACK));\n"+
"console.log('isMated RED:',b.isMated(RED),'BLACK:',b.isMated(BLACK));\n"+
"console.log('Eval:',b.evaluate());\n"+
"console.log('');console.log('--- Making move ---');\n"+
'var m={fx:1,fy:7,tx:4,ty:7};\n'+
'if(b.isLegal(m)){\n'+
"b.doMove(m);console.log('Cannon move OK, turn:',b.turn);\n"+
"console.log('BLACK moves:',b.allLegal(BLACK).length);\n"+
"b.undo();console.log('Undone');\n"+
"}else console.log('Cannon move ILLEGAL');\n"+
"console.log('');console.log('=== AI Search ===');\n"+
'var bb=new Board();\n'+
'var start=Date.now();\n'+
'var best=searchBest(bb,3000);\n'+
'var elapsed=Date.now()-start;\n'+
"console.log('searchBest:',best?JSON.stringify(best):'null','('+elapsed+'ms)');\n"+
'if(best){\n'+
"bb.doMove(best);console.log('After AI, turn:',bb.turn);\n"+
'}else{\n'+
"console.log('AI returned null!');\n"+
"console.log('allLegal count:',bb.allLegal(bb.turn).length);\n"+
'}\n'+
"console.log('=== DONE ===');\n"+
'}catch(e){\n'+
"console.log('ERROR:',e.message);\n"+
'console.log(e.stack);\n'+
'}\n';

fs.writeFileSync('/mnt/openclaw_home/.openclaw/workspace/tmp/test_runner.js', stubs+js+test);
console.log('Written OK');
