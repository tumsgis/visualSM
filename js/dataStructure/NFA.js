function NFA() {
    this._transTable = {};
}

NFA.prototype = new SM();

NFA.prototype._initRoute = function(str, startState) {
    this._crntState = this.findState(startState.id);    // find state by id
    this._routeStr = str + '|';
    this._routeEdges = [];
};

NFA.prototype.updateTransTable = function() {
    for (var i = 0; i < this._states.length; i++) {
        var aState = this._states[i];
        this._transTable[aState.id] = {};
        for (var a = 0; a < this.alphabet.length; a++) {
            var aSymbol = this.alphabet[a];
            this._transTable[aState.id][aSymbol] = aState.transition(aSymbol);
        }
    }
};

// Should print the correct transition table now.
NFA.prototype.dumpTransTable = function() {
    var dumpData = [];
    var firstLine = "STATE \t ";
    for (var i = 0; i < this.alphabet.length; i++)
        firstLine += this.alphabet[i] + "\t\t";
    dumpData.push(firstLine);

    for (var state = 0; state < util.objSize(this._transTable); state++) {
        var aState = this._transTable[state];
        var tmpStr = state + "\t\t";
        for (var symbol = 0; symbol < this.alphabet.length; symbol++) {
            var symbolSet = aState[this.alphabet[symbol]];
            tmpStr += "{";
            for (var i = 0; i < symbolSet.length(); i++) 
                tmpStr += symbolSet.getObject(i).id + ", ";
            tmpStr += "} \t";
        }
        dumpData.push(tmpStr);
    }
    return dumpData;
};

// Set of NFA states reachable from and NFA state
// on eps-transitions alone.
// Pre : state is an instance of the State object.
NFA.prototype.epsClosureState = function(state) {
    var epsClosureS = new Set();
    var Dstates = [state];
    while (Dstates.length > 0) {
        var T = Dstates.pop();
        for (var a = 0; a < this.alphabet.length; a++) { // for each input symbol
            var anInputSymbol = this.alphabet[a];
            var U = this.epsClosureSet(this.move(T, anInputSymbol));
            if (!util.contains(Dstates, U))
                for (var i = 0; i < U.length(); i++) {
                    Dstates.push(U[i]);
                    epsClosureS.add(U.getObject(i));
                }
        }
    }
    return epsClosureS;
};


// Set of NFA states reachable from some NFA state
// in the stateSet on eps-transitions alone.
NFA.prototype.epsClosureSet = function(stateSet) {
    var stack = [];
    for (var i = 0; i < stateSet.length(); i++)
        stack.push(stateSet.getObject(i));
    var epsClosureT = stateSet;

    while(stack.length > 0) {
        var t = stack.pop();
        var epsStateSet = this.move(t, 'eps');
        for (var i = 0; i < epsStateSet.length(); i++) {
            var u = epsStateSet.getObject(i);
            if (u  && !epsClosureT.contains(u)) {
                epsClosureT.add(u);
                stack.push(u);
            }
        }
    }
    return epsClosureT;
};

var alreadyOn = [],
    oldStates = [],
    newStates = [];

NFA.prototype.simulate = function(str) {

    var startState = this.findStartState();
    str = str.toLowerCase();
    this._initRoute(str, startState);

    // init alreadyOn
    for (var i = 0; i < this._states.length; i++)
        alreadyOn[this._states[i].id] = false;

    var epsClosureStart = this.epsClosureState(this._startingState);
    for (var i = 0; i < epsClosureStart.length(); i++) {
        var aState = epsClosureStart.getObject(i);
        oldStates.push(aState);
        alreadyOn[aState.id] = true;
        this.addState(aState);
    }


    for (var i = 0; i < str.length; i++) {

        if (!this.symbolInAlphabet(str[i])) break;

        var c = str[i];
        // for (s on oldStates)
        for (var s = 0; s < oldStates.length; s++) {
            var aState = oldStates[s];
            for (var j = 0; j < this.move(aState, c).length(); j++) {
                var moveState = this.move(aState, c).getObject(j);
                if (moveState && !alreadyOn[moveState.id])
                    this.addState(moveState);
            }
            oldStates.shift();
        }

        // for (s on newStates)
        for (var s = 0; s < newStates.length; s++) {
            var aState = newStates[s];
            newStates.shift();
            oldStates.push(aState);
            alreadyOn[aState.id] = false;
        }
    }

    // add oldStates to a new set
    var set = new Set();
    for (var i = 0; i < oldStates.length; i++)
        set.add(oldStates[i]);

    if (util.areInterSecting(set, this.finalStates))
        console.log("YES");
    else
        console.log("NO");

};

// Returns the new combined state
NFA.prototype.maybeCombineStates = function(states, symbol) {
    if (states.length() > 1) {

        // generate new state
        var newName = "";
        var isStart = false,
            isFin = false;
        for (var i = 0; i < states.length(); i++) {
            var aState = states.getObject(i);
            if (aState.name)
                newName += aState.name;
            if (aState.isStart()) isStart = true;
            if (aState.isFin()) isFin = true;
        }

        // this is awkardly messy
        // TODO: don't be so messy
        var targetState = states.getObject(0);
        this.generateState(targetState.cx, targetState.cy, newName, isStart, isFin);
        var newestId = this._id - 1;
        var newestState = g_SM.findState(newestId);
        this.generateEdge(this._crntState, newestState, [symbol]);
        var newestEdge = this._edges[this._edges.length - 1];
        newestEdge.x1 = this._crntState.cx;
        newestEdge.y1 = this._crntState.cy;
        newestEdge.x2 = newestState.cx;
        newestEdge.y2 = newestState.cy;
        this._routeEdges.push(newestEdge);

        return newestState;
    }
    else {
        if (states.length() > 0) {
            this._routeEdges.push(states.getObject(0).incomingEdges);
            return states.getObject(0);
        }            
    }
};


NFA.prototype.addState = function(s) {
    newStates.push(s);
    alreadyOn[s.id] = true;
    for (var i = 0; i < this.move(s, 'eps'); i++) {
        var aState = this.move(s, 'eps')[i];
        if (!alreadyOn[aState.id])
            this.addState(aState);
    }
};

// Returns the set of states that you can go to when you're in
// state and you read symbol.
NFA.prototype.move = function(state, symbol) {
    var set = new Set();
    if (state) {
        // this set is the new state
        this._crntState = this.maybeCombineStates(state.transition(symbol), symbol);
        set.add(this._crntState);
    }
    return set;
};

/////////////////////////////////////////////////////////


var nfaTest = function() {
    var testNfa = new NFA();

    // Remember to make alphabet manually when testing/debugging.
    testNfa.alphabet = ['a', 'b', 'eps'];

    testNfa.generateState(0, 0, 'A', true, false);
    testNfa.generateState(0, 0, 'B', false, true);
    testNfa.generateState(0, 0, 'C', false, true);

    testNfa.generateEdge(testNfa.findState('A'), testNfa.findState('B'), ['a', 'b', 'eps']);
    testNfa.generateEdge(testNfa.findState('A'), testNfa.findState('C'), ['a']);

    testNfa.updateTransTable();

    var transTableData = testNfa.dumpTransTable();
    for (var i = 0; i < transTableData.length; i++)
        console.log(transTableData[i]);

    testNfa.simulate(['a']);
};

//nfaTest();