// a chunks with a, b, c
import(["./a", "./b", "./c"]);

// a chunk with a, b, d
require.ensure(["./a"], function(require) {
	require("./b");
	require("./d");
});
