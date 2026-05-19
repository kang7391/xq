var fs=require('fs');
var html=fs.readFileSync('/mnt/openclaw_home/.openclaw/workspace/中国象棋.html','utf8');
var js=html.match(/<script>([\s\S]*?)<\/script>/)[1];

js=js.replace(/const CELL=56, OFFSET_X=28, OFFSET_Y=24;\s*/,'');
js=js.replace(/const canvas=document\.getElementById\('board'\);\s*/,'');
js=js.replace(/const turnSpan=document\.getElementById\('turnIndicator'\);\s*/,'');
js=js.replace(/const statusSpan=document\.getElementById\('statusText'\);\s*/,'');
js=js.replace(/const toastEl=document\.getElementById\('toast'\);\s*/,'');
js=js.replace(/const BD_W=CELL\*8\+OFFSET_X\*2, BD_H=CELL\*9\+OFFSET_Y\*2;\s*/,'');
// Remove event listener bindings and startup
js=js.replace(/canvas\.addEventListener\([^;]+;\s*/g,'');
js=js.replace(/document\.getElementById\('[^']+'\)\.addEventListener\([^;]+;\s*/g,'');
js=js.replace(/document\.querySelectorAll\([^;]+;\s*/g,'');
js=js.replace("newGame();\nupdateUI();\n","");

var stubs=[
'var canvas={',
'  getContext:function(){',
'    return{clearRect:function(){},save:function(){},restore:function(){},',
'      fillRect:function(){},beginPath:function(){},moveTo:function(){},',
'      lineTo:function(){},stroke:function(){},fill:function(){},',
'      fillText:function(){},arc:function(){},strokeRect:function(){},',
'      createRadialGradient:function(){return{addColorStop:function(){}}},',
'      createLinearGradient:function(){return{addColorStop:function(){}}}}',
'  },',
'  width:1,height:1,addEventListener:function(){}',
'};',
'var turnSpan={textContent:""};',
'var statusSpan={textContent:""};',
'var toastEl={textContent:"",classList:{add:function(){},remove:function(){}},_tm:null};',
'var CELL=56,OFFSET_X=28,OFFSET_Y=24,BD_W=504,BD_H=552;',
'var document={getElementById:function(){return{addEventListener:function(){},textContent:"",classList:{add:function(){},remove:function(){}}}},querySelectorAll:function(){return{forEach:function(){}}}};',
'var clearTimeout=function(){};',
'var performance={now:function(){return Date.now();}};',
'var setTimeout=function(fn,ms){fn();return 1;};',
].join('\n');

var test=[
'try{',
"console.log('=== Board basic test ===');",
'var b=new Board();',
"console.log('Turn:',b.turn,'(0=RED)');",
'var rM=b.allLegal(RED);',
"console.log('RED legal moves:',rM.length);",
'if(rM.length) console.log("Sample:",JSON.stringify(rM.slice(0,3)));',
"console.log('BLACK legal moves:',b.allLegal(BLACK).length);",
"console.log('inCheck RED:',b.inCheck(RED),'BLACK:',b.inCheck(BLACK));",
"console.log('isMated RED:',b.isMated(RED),'BLACK:',b.isMated(BLACK));",
"console.log('Eval:',b.evaluate());",
"console.log('');console.log('--- Making move ---');",
'var m={fx:1,fy:7,tx:4,ty:7};',
'if(b.isLegal(m)){',
"b.doMove(m);console.log('Cannon (1,7)->(4,7) OK, turn:',b.turn);",
"console.log('BLACK moves:',b.allLegal(BLACK).length);",
"b.undo();console.log('Undone');",
"}else console.log('Cannon (1,7)->(4,7) ILLEGAL');",
"console.log('');console.log('=== AI Search ===');",
'var bb=new Board();',
'var start=Date.now();',
'var best=searchBest(bb,3000);',
'var elapsed=Date.now()-start;',
"console.log('searchBest:',best?JSON.stringify(best):'null','('+elapsed+'ms)');",
'if(best){',
"bb.doMove(best);console.log('After AI, turn:',bb.turn);",
'}else{',
"console.log('AI returned null!');",
"console.log('allLegal count:',bb.allLegal(bb.turn).length);",
'}',
"console.log('=== DONE ===');",
'}catch(e){',
"console.log('ERROR:',e.message);",
'console.log(e.stack);',
'}',
].join('\n');

fs.writeFileSync('/mnt/openclaw_home/.openclaw/workspace/tmp/test_runner.js', stubs+'\n'+js+'\n'+test);
console.log('Written OK');
