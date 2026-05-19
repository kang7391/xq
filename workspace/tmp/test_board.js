const fs = require('fs');
const html = fs.readFileSync('/mnt/openclaw_home/.openclaw/workspace/中国象棋.html', 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];

// Build minimal stubs for browser globals
const stubs = `
const canvas = { getContext(){ return { clearRect(){},save(){},restore(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},fill(){},fillText(){},arc(){},strokeRect(){},createRadialGradient(){return{addColorStop(){}}},createLinearGradient(){return{addColorStop(){}}} } }, width:1, height:1 };
const turnSpan = { textContent:'' };
const statusSpan = { textContent:'' };
const toastEl = { textContent:'', classList:{add(){},remove(){}}, _tm:null };
const document = { getElementById(){ return { addEventListener(){}, textContent:'', classList:{add(){},remove(){}} } }, querySelectorAll(){ return { forEach(){} } } };
const BD_W=504, BD_H=552;
const CELL=56, OFFSET_X=28, OFFSET_Y=24;
`;

const fullCode = stubs + js + `

// Test harness
try {
  const b = new Board();
  console.log("Board created OK, turn:", b.turn);

  const moves = b.allLegal(RED);
  console.log("RED legal moves count:", moves.length);
  if (moves.length > 0) {
    console.log("First 5:",
      moves.slice(0,5).map(m=>"("+m.fx+","+m.fy+")->("+m.tx+","+m.ty+")").join(", "));
  }

  console.log("inCheck RED:", b.inCheck(RED));
  console.log("inCheck BLACK:", b.inCheck(BLACK));
  console.log("isMated RED:", b.isMated(RED));
  console.log("isMated BLACK:", b.isMated(BLACK));
  console.log("Evaluate:", b.evaluate());

  // Try a move
  const firstMove = moves[0];
  if (firstMove) {
    const captured = b.doMove(firstMove);
    console.log("After move", JSON.stringify(firstMove), "captured:", captured, "turn now:", b.turn);
    console.log("BLACK legal moves:", b.allLegal(BLACK).length);
    b.undo();
    console.log("After undo, turn:", b.turn);
  }

  // Test genRaw for specific pieces
  console.log("Chariot(0,9) raw:", b.genRaw(0,9).length);
  console.log("Horse(1,9) raw:", b.genRaw(1,9).length);
  console.log("Cannon(1,7) raw:", b.genRaw(1,7).length);

  // --- Test AI search ---
  console.log("\\n=== Testing AI search ===");
  const start = Date.now();
  const result = searchBest(b, 2000); // 2 seconds
  const elapsed = Date.now() - start;
  console.log("AI result:", result ? JSON.stringify(result) : "null", "in", elapsed+"ms");
  if (result) {
    console.log("AI suggests: ("+result.fx+","+result.fy+") -> ("+result.tx+","+result.ty+")");
    b.doMove(result);
    console.log("After AI move, turn:", b.turn);
  }

  console.log("\\n=== ALL TESTS PASSED ===");
} catch(e) {
  console.log("ERROR:", e.message);
  console.log("STACK:", e.stack);
}
`;

fs.writeFileSync('/mnt/openclaw_home/.openclaw/workspace/tmp/test_runner.js', fullCode);
console.log('Test runner written');
