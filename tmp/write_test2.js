const fs=require('fs');
const html=fs.readFileSync('/mnt/openclaw_home/.openclaw/workspace/中国象棋.html','utf8');
let js=html.match(/<script>([\s\S]*?)<\/script>/)[1];

// Replace browser-only declarations with stubs
js = js
  .replace(
    /const canvas=document\.getElementById\('board'\)/,
    'var canvas={getContext(){return{clearRect(){},save(){},restore(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},fillText(){},arc(){},strokeRect(){},createRadialGradient(){return{addColorStop(){}}},createLinearGradient(){return{addColorStop(){}}}}},width:1,height:1}'
  )
  .replace(
    /const turnSpan=document\.getElementById\('turnIndicator'\)/,
    'var turnSpan={textContent:""}'
  )
  .replace(
    /const statusSpan=document\.getElementById\('statusText'\)/,
    'var statusSpan={textContent:""}'
  )
  .replace(
    /const toastEl=document\.getElementById\('toast'\)/,
    'var toastEl={textContent:"",classList:{add(){},remove(){}},_tm:null}'
  )
  .replace(
    /const BD_W=CELL\*8\+OFFSET_X\*2, BD_H=CELL\*9\+OFFSET_Y\*2;/,
    'var BD_W=504,BD_H=552;'
  )
  .replace(
    /document\.querySelectorAll/g,
    '({forEach(){}}).querySelectorAll'
  )
  .replace(
    /document\.getElementById/g,
    '(function(){return{addEventListener(){},textContent:"",classList:{add(){},remove(){}}};})'
  );

// Override setTimeout to work synchronously in test
const testHeader = `
// ===== TEST OVERRIDES =====
var gTimers=[];
var stSetTimeout=setTimeout;
setTimeout=function(fn,ms){gTimers.push({fn,ms});return gTimers.length;};
clearTimeout=function(){};
var performance={now:function(){return Date.now();}};
// ===== END OVERRIDES =====

`;

const testFooter = `

// ===== ACTUAL TEST =====
try{
  console.log("=== Board basic test ===");
  var b=new Board();
  console.log("Turn:",b.turn,"(0=RED 1=BLACK)");

  var rM=b.allLegal(RED);
  console.log("RED legal moves:",rM.length);
  if(rM.length) console.log("Sample:",JSON.stringify(rM.slice(0,3)));

  var bM=b.allLegal(BLACK);
  console.log("BLACK legal moves:",bM.length);

  console.log("inCheck RED:",b.inCheck(RED),"BLACK:",b.inCheck(BLACK));
  console.log("isMated RED:",b.isMated(RED),"BLACK:",b.isMated(BLACK));
  console.log("Eval:",b.evaluate());

  // Try a specific move: RED cannon (1,7) -> (4,7) 炮二平五
  console.log("\\n--- Making a specific move ---");
  var specMove={fx:1,fy:7,tx:4,ty:7};
  if(b.isLegal(specMove)){
    b.doMove(specMove);
    console.log("Moved cannon (1,7)->(4,7), turn:",b.turn,"turn===1:",b.turn===1);
    bM=b.allLegal(BLACK);
    console.log("BLACK legal moves after:",bM.length);
    b.undo();
    console.log("Undone, turn:",b.turn);
  }else{
    console.log("Cannon move (1,7)->(4,7) illegal - checking why...");
    console.log("Cannon raw:",JSON.stringify(b.genRaw(1,7).slice(0,5)));
    // Check isLegal
    console.log("isLegal:",b.isLegal(specMove));
    // Check inCheck after
    var b2=JSON.parse(JSON.stringify(b));
    // Actually clone and test
    console.log("inCheck before move:",b.inCheck(RED));
  }

  // Test allLegal and inCheck for BLACK on clean board
  console.log("\\n--- AI search test ---");
  var bb=new Board();
  console.log("Fresh board, BLACK allLegal:",bb.allLegal(BLACK).length);

  var start=Date.now();
  var best=searchBest(bb,3000);
  var elapsed=Date.now()-start;
  console.log("searchBest result:",best?JSON.stringify(best):"null","("+elapsed+"ms)");
  
  if(best){
    bb.doMove(best);
    console.log("After AI move, turn:",bb.turn);
    console.log("SUCCESS: AI found a move");
  }else{
    // Debug: check what's happening
    console.log("DEBUG: searchBest returned null");
    console.log("DEBUG: Checking allLegal for turn",bb.turn);
    var bbMoves=bb.allLegal(bb.turn);
    console.log("DEBUG: allLegal count:",bbMoves.length);
    if(bbMoves.length>0){
      console.log("DEBUG: There ARE legal moves, checking isLegal of first:",JSON.stringify(bbMoves[0]));
      console.log("DEBUG: isLegal result:",bb.isLegal(bbMoves[0]));
    }else{
      // Walk through all pieces
      for(var y=0;y<10;y++)for(var x=0;x<9;x++){
        var p=bb.b[y][x];
        if(p&&p.c===bb.turn){
          var raw=bb.genRaw(x,y);
          if(raw.length>0){
            console.log("Piece at ("+x+","+y+") has raw moves:",raw.length,"legal:",bb.isLegal(raw[0]));
          }
        }
      }
    }
    console.log("FAIL: AI search returned null");
  }

  console.log("\\n=== DONE ===");
}catch(e){
  console.log("ERROR:",e.message);
  console.log(e.stack);
}
`;

fs.writeFileSync('/mnt/openclaw_home/.openclaw/workspace/tmp/test_runner.js', testHeader + js + testFooter);
console.log('Written OK');
