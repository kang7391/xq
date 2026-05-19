const fs=require('fs');
const html=fs.readFileSync('/mnt/openclaw_home/.openclaw/workspace/中国象棋.html','utf8');
let js=html.match(/<script>([\s\S]*?)<\/script>/)[1];

// Patch browser-only declarations with no-ops
const stubs = `
var canvas={getContext(){return{clearRect(){},save(){},restore(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},fillText(){},arc(){},strokeRect(){},createRadialGradient(){return{addColorStop(){}}},createLinearGradient(){return{addColorStop(){}}}}},width:1,height:1};
var turnSpan={textContent:""};
var statusSpan={textContent:""};
var toastEl={textContent:"",classList:{add(){},remove(){}},_tm:null};
var BD_W=504,BD_H=552,CELL=56,OFFSET_X=28,OFFSET_Y=24;
var document={getElementById:function(){return{addEventListener:function(){},textContent:"",classList:{add:function(){},remove:function(){}}}},querySelectorAll:function(){return{forEach:function(){}}}};
var clearTimeout=function(){};
var setTimeout=function(fn){fn();return 1;};
`;

// Remove the original declarations
js = js.replace(/const canvas=document\.getElementById\('board'\);\s*/, '');
js = js.replace(/const turnSpan=document\.getElementById\('turnIndicator'\);\s*/, '');
js = js.replace(/const statusSpan=document\.getElementById\('statusText'\);\s*/, '');
js = js.replace(/const toastEl=document\.getElementById\('toast'\);\s*/, '');
js = js.replace(/const BD_W=CELL\*8\+OFFSET_X\*2, BD_H=CELL\*9\+OFFSET_Y\*2;\s*/, '');

const testCode = `
// ===== TEST =====
try{
  console.log("=== Board basic test ===");
  var b=new Board();
  console.log("Turn:",b.turn,"(0=RED)");

  var rM=b.allLegal(RED);
  console.log("RED legal moves:",rM.length);
  if(rM.length) console.log("Sample:",JSON.stringify(rM.slice(0,3)));

  console.log("BLACK legal moves:",b.allLegal(BLACK).length);
  console.log("inCheck RED:",b.inCheck(RED),"BLACK:",b.inCheck(BLACK));
  console.log("isMated RED:",b.isMated(RED),"BLACK:",b.isMated(BLACK));
  console.log("Eval:",b.evaluate());

  // Try a move
  console.log("\\n--- Making a move ---");
  var specMove={fx:1,fy:7,tx:4,ty:7};
  if(b.isLegal(specMove)){
    b.doMove(specMove);
    console.log("Cannon (1,7)->(4,7) OK, turn now:",b.turn);
    console.log("BLACK moves:",b.allLegal(BLACK).length);
    b.undo();
    console.log("Undone, turn:",b.turn);
  }else{
    console.log("Cannon (1,7)->(4,7) ILLEGAL");
  }

  // Test search
  console.log("\\n=== AI Search ===");
  var bb=new Board();
  var start=Date.now();
  var best=searchBest(bb,3000);
  var elapsed=Date.now()-start;
  console.log("searchBest:",best?JSON.stringify(best):"null","("+elapsed+"ms)");

  if(best){
    bb.doMove(best);
    console.log("After AI, turn:",bb.turn);
  }else{
    console.log("AI returned null! Debugging...");
    console.log("allLegal count:",bb.allLegal(bb.turn).length);
    // Check each piece
    for(var y=0;y<10;y++)for(var x=0;x<9;x++){
      var p=bb.b[y][x];
      if(p&&p.c===bb.turn){
        var raw=bb.genRaw(x,y);
        if(raw.length){
          var legal=bb.isLegal(raw[0]);
          console.log("("+x+","+y+") type:"+p.t+" raw:"+raw.length+" legal:"+legal);
          if(legal) console.log("  sample:",JSON.stringify(raw[0]));
        }
      }
    }
  }

  console.log("\\n=== DONE ===");
}catch(e){
  console.log("ERROR:",e.message);
  console.log(e.stack);
}
`;

fs.writeFileSync('/mnt/openclaw_home/.openclaw/workspace/tmp/test_runner.js', stubs + js + testCode);
console.log('Written OK');
