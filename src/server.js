var easymidi = require('easymidi');

var inputs = easymidi.getInputs();
var outputs = easymidi.getOutputs();

console.log("outputs: ", outputs);

var output = new easymidi.Output('IAC Driver Bus 1');
output.send('noteon', {
    note: 64,
    velocity: 127,
    channel: 3
});
output.send('noteon', {
    note: 63,
    velocity: 127,
    channel: 3
});
output.send('noteon', {
    note: 64,
    velocity: 0,
    channel: 3
});output.send('noteon', {
    note: 63,
    velocity: 0,
    channel: 3
});