/*
 A Finite State Machine, 
 deterministic or non-deterministic.

 Usage:
    
    SM.alphabet = [String];
    
    SM.generateState(name, start, fin);
    .
    .
    .

    SM.generateEdge(fromState, toState, symbols);
    .
    .
    .

    SM.evalString(String);

    (see details below)

*/
var SM = {

    _states : [],       
    _edges : [],

    // All routes that have to be checked
    // and all of their current States.
    _routes : [],
    _crntStates : [],   

    // _routes.length === _routeIndexes.length
    
    // _routeIndexes stores the index of the input string that
    // SM has already evaluated up to.

    // inputStr[_routeIndexes[i]] has been evaluated
    // for _routes[i]
    _routeIndexes : [],

    alphabet : [],

    // Usage : SM._clearRoutes(str);
    // Post : _routes and _crntStates have been
    //        initialized for next evaluation of a String.
    _clearRoutes : function(str) {
        this._routes = [];
        this._crntStates = [];

        this._crntStates[0] = this.findState('q0');    // starting state
        this._routes[0] = str + ' |';

        this._routeIndexes[0] = 0;
    },

    // Usage : SM.generateState(name, start, fin);
    // Pre : name is a String. start and fin are Booleans.
    // Post : A new State with the name name and specifications
    //        whether it's a starting or a final State (or neither)
    //        has been added to _states.
    generateState : function(name, start, fin) {
        var state = new State({
            name : name,
            start : start,
            fin : fin
        });

        this._states.push(state);
    },

    // Usage : SM.generateEdge(fromState, toState, symbols)
    // Pre : fromState and toState are of type State. symbols
    //       is an array of Strings.
    // Post : A new Edge connecting fromState and toState
    //        by symbols.
    generateEdge : function(fromState, toState, symbols) {
        var edge = new Edge({
            fromState : fromState,
            toState : toState,
            symbols : symbols
        });
        
        this._edges.push(edge);
        
        fromState.outgoingEdges.push(edge);
        toState.incomingEdges.push(edge);
    },

    // Usage : SM.findState(name);
    // Pre : name is a String
    // Return value : A State with the name name,
    //                if such a State exists.
    findState : function(name) {
        for (var i in this._states) {
            if (this._states[i].name === name) {
                return this._states[i];
            }
        }
        console.log('No state with that name exists');
        return false;
    },

    // Usage : SM.evalString(str);
    // Return value : An array of routes the SM takes
    //                to evaluate the input str.
    evalString : function(str) {

        str = str.toLowerCase();    // upper case symbols accepted as well
        this._clearRoutes(str);  // make ready for evaluation

        for (var r = 0; r < this._routes.length; r++) {
            var routeIndex = this._routeIndexes[r];

            // str[0...routeIndex] has been evaluated
            // for SM._routes[r].
            for (var i = routeIndex; i < str.length; i++) {
                
                // Stop evaluating if one of the input symbols
                // is not in the alphabet.
                if (!this.symbolInAlphabet(str[i], r)) break; 

                var crntState = this._crntStates[r];

                this._routes[r] += crntState.name + ' -> ';
                var psblEdges = crntState.psblTrans(str[i]);       

                // If the SM is non-deterministic it has to
                // split up the routes and evaluate
                // every possible route.
                if (psblEdges.length > 1) {

                    var epsilonIndexes = [];

                    for (var j = 0; j < psblEdges.length; j++)
                        if (psblEdges[j].length === 2) {
                            epsilonIndexes.push(j);
                            psblEdges[j] = psblEdges[j][0];
                        }

                    //this._routeIndexes.push(routeIndex+1);
                    this.splitRoutes(psblEdges.length,
                                     this._routes[r],
                                     psblEdges);

                    for (var j = 0; j < psblEdges.length; j++) {
                        if (util.contains(epsilonIndexes, j)) {
                            this._routeIndexes[j] = routeIndex;
                        }
                        else
                            this._routeIndexes[j] = routeIndex + 1;
                    }
                }
                else if (psblEdges.length === 1) {
                    if (psblEdges[0].length === 2) {
                        this._routeIndexes[r] = routeIndex;
                        this._crntStates[r] = psblEdges[0][0].toState;
                        --i;
                    }
                    else {
                        this._routeIndexes[r] = routeIndex + 1;
                        this._crntStates[r] = psblEdges[0].toState;
                    }
                }
                else
                    this._routes[r] += "No possible transition from " + crntState.name 
                                        + " given input " + str[i] + ', ';
            }
            this.addAcceptance(r);
        }
        this.printRoutes();
    },    


    // Usage : SM.splitRoutes(nr, route, psblEdges);
    // Post : SM._routes now has nr entries of route.
    //        SM._crntStates[r]s now has nr entries of this._crntStates[r]
    splitRoutes : function(nr, route, psblEdges) {
        
        this._routes.pop();
        this._crntStates.pop();
        
        for (var i = 0; i < nr; i++) {
            this._routes.push(route);
            this._crntStates.push(psblEdges[i].toState);
        }
    },

    // Usage : SM.printRoutes();
    // Post : The routes SM took to evaluate the input
    //        have been logged to the console.
    printRoutes : function() {
        for (var i = 0; i < this._routes.length; i++) {
            console.log('ROUTE ' + (i+1) + ' ' + this._routes[i]);
        }
    },

    // Usage : SM.symbolInAlphabet(str, r)
    // Post : Error msg printed if false
    // Return value : true if str is in SM.alphabet
    symbolInAlphabet : function(str, r) {
        if (util.contains(this.alphabet, str)) {
            return true;
        }
        else {
            this._routes[r] += ' Input Error: ' + str + ' not in alphabet of SM';
            return false;
        }
    },

    // Usage : SM.addAcceptance(r);
    // Pre : SM has evaluated all of it's input.
    //       r is the index for the current route and
    //       the current State in the evaluation.
    // Post : An indication of whether the input str
    //        has been accepted or not by SM has been
    //        pushed to the back of the route string.
    addAcceptance : function(r) {
        if (this._crntStates[r].name === 'qf') {
             this._routes[r] += ' ' + this._crntStates[r].name + ' : Accepted';
        }
        else{
            this._routes[r] += ' ' + this._crntStates[r].name + ' : NOT Accepted';
        }
    }

};


// DFA
// L = (a(a + b)) + (b(a + b))
/*
SM.alphabet = ['a', 'b'];

SM.generateState('q0', true, false);
SM.generateState('q1', false, false);
SM.generateState('q2', false, false);
SM.generateState('qf', false, true);

SM.generateEdge(SM.findState('q0'), SM.findState('q1'), ['a']);
SM.generateEdge(SM.findState('q0'), SM.findState('q2'), ['b']);
SM.generateEdge(SM.findState('q1'), SM.findState('qf'), ['a', 'b']);
SM.generateEdge(SM.findState('q2'), SM.findState('qf'), ['a', 'b']);

// Trash state
SM.generateState('qTrash', false, false);
SM.generateEdge(SM.findState('qf'), SM.findState('qTrash'), ['a', 'b']);
SM.generateEdge(SM.findState('qTrash'), SM.findState('qTrash'), ['a', 'b']);

// Accepted
SM.evalString('aa');
SM.evalString('ab');
SM.evalString('ba');
SM.evalString('bb');
SM.evalString('AB');

// NOT Accepted
SM.evalString('aaa');
SM.evalString('bab');
SM.evalString('aaaaaaa');

// Wrong input
SM.evalString('ac');
*/

/*
Output from DFA above.

aa |q0 -> q1 ->  qf : Accepted
ab |q0 -> q1 ->  qf : Accepted
ba |q0 -> q2 ->  qf : Accepted
bb |q0 -> q2 ->  qf : Accepted
ab |q0 -> q1 ->  qf : Accepted
aaa |q0 -> q1 -> qf ->  qTrash : NOT Accepted
bab |q0 -> q2 -> qf ->  qTrash : NOT Accepted
aaaaaaa |q0 -> q1 -> qf -> qTrash -> qTrash -> qTrash -> qTrash ->  qTrash : NOT Accepted
ac |q0 ->  Input Error: c not in alphabet of SM q1 : NOT Accepted
*/

// NFA
// L = (a(a + b)) + (b(a + b))

// Three possible ways for (a(a + b))

SM.alphabet = ['a', 'b'];

SM.generateState('q0', true, false);
SM.generateState('q1', false, false);
SM.generateState('q2', false, false);
SM.generateState('q3', false, false);
SM.generateState('q4', false, false);
SM.generateState('qf', false, true);

SM.generateEdge(SM.findState('q0'), SM.findState('q1'), ['a']);
SM.generateEdge(SM.findState('q0'), SM.findState('q2'), ['b']);
SM.generateEdge(SM.findState('q0'), SM.findState('q3'), ['a']);
SM.generateEdge(SM.findState('q0'), SM.findState('q4'), ['a']);
SM.generateEdge(SM.findState('q1'), SM.findState('qf'), ['a', 'b']);
SM.generateEdge(SM.findState('q2'), SM.findState('qf'), ['a', 'b']);
SM.generateEdge(SM.findState('q3'), SM.findState('qf'), ['a', 'b']);
SM.generateEdge(SM.findState('q4'), SM.findState('qf'), ['a']);

SM.generateState('qEps', false, false);
SM.generateEdge(SM.findState('q0'), SM.findState('qEps'), [consts.EPSILON]);
SM.generateEdge(SM.findState('qEps'), SM.findState('q1'), [consts.EPSILON]);

SM.evalString('aa');

/*
Output from NFA above

ROUTE 1 aa |q0 -> q1 ->  qf : Accepted
ROUTE 2 aa |q0 -> q3 ->  qf : Accepted
ROUTE 3 aa |q0 -> q4 ->  qf : Accepted
ROUTE 4 aa |q0 -> qEps -> q1 -> qf -> No possible transition from qf given input a,  qf : Accepted
*/
