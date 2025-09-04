# Fingerprint HL7 Message Fields
Takes a simple fingerprint of an HL7 message, including some fields and optionally ignoring others.

### Examples
Fingerprint some fields:

```javascript
var msg = /* XML object */
var fields = [ 'PID.2', 'PID.3', 'OBX' ];
var ignores = [ 'MSH', 'EVN' ];

var fingerprint = fingerprint(msg, fields, ignores);
```
