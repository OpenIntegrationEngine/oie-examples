/**
 * Takes a fingerprint of a message.
 *
 * @param {XML} msg An XML object representing HL7.
 * @param {String[]} fields An array of field names to hash (e.g. 'PID', 'SCH.5', or 'MSH.5.1')
 * @param {String[]} ignores (optional) An array of fields to *completely* ignore (e.g. 'MSH', 'PID.5')
 *        NOTE: You can't (currently) ignore a field inside of one of the 'fields' you have already requested
 * @param {String} hfunc (optional) The name of the hashing function to use. Valid values are 'hashcode' (which uses a simple Arrays.hashCode call) or any of the function supported by your JVM's MessageDigest class (e.g. MD5, SHA-1, SHA-256, etc.). The default is 'hashcode'.
 *
 * @return {String} A string fingerprint of the requested fields.
 *
 * @throws If no requested fields could be found in the message.
 */
function fingerprint(msg, fields, ignores, hfunc) {
  if(!hfunc) {
  	hfunc = 'hashcode';
  }

  var captures = capture(msg, fields, ignores);

  if(0 < captures.length) {
    // Convert to a Java array of Java strings
    var len = captures.length;
    var javaStrings = java.lang.reflect.Array.newInstance(new java.lang.String().getClass(), len);
    for(i=0; i<len; ++i) {
      javaStrings[i] = captures[i].toString();
    }

    // Return a js string
    if(hfunc == 'hashcode') {
      return '' + java.lang.Integer.toHexString(java.util.Arrays.hashCode(javaStrings));
    } else {
      var md = java.security.MessageDigest.getInstance(hfunc);
      for(i=0; i<len; ++i) {
        md.update(javaStrings[i].getBytes('UTF-8'));
      }
      return toHex(md.digest());
    }
  } else {
    throw 'Captured no data from message; cannot take fingerprint';
  }
}

/**
 * Convert a byte array to a string if hex digits.
 *
 * For example, toHex([ 0xca, 0xfe ]) would return "cafe".
 *
 * @param {byte[]} bytes A byte array
 *
 * @return {String} A js string representation of the bytes in simple hex encoding.
 */
function toHex(bytes) {
  var hexString = "";
  for (var i = 0; i < bytes.length; i++) {
    var byteValue = bytes[i] & 0xFF; 
    var hex = byteValue.toString(16);
    if (hex.length === 1) {
      // Ped if necessary
      hex = "0" + hex;
    }
    hexString += hex;
  }
  return hexString;
}

/**
 * Captures field (etc.) values from an HL7 message.
 *
 * @param {XML} msg An XML object representing HL7.
 * @param {String[]} fields An array of field names whose values should be captured (e.g. 'PID', 'SCH.5', or 'MSH.5.1')
 * @param {String[]} ignores (optional) An array of fields to *completely* ignore (e.g. 'MSH', 'PID.5')
 *        NOTE: You can't (currently) ignore a field inside of one of the 'fields' you have already requested
 *
 * @returns {String[]} An array of captured field values (without any indication of which fields they came from)
 */
function capture(msg, fields, ignores) {
  // Clone the incoming 'fields' array; We may mutate it
  var fieldNames = fields.map(s => ''+s); // Convert all strings to js strings, just in case

  var captures = [];

  for each (seg in msg.children()) {
    scan_node(seg, fields, captures, ignores);
    if(0 == fields.length) {
      return captures;
    }
  }

  return captures;
}

/**
 * Scans a node and its children for data to capture.
 *
 * @param {XML} msg An XML object representing HL7.
 * @param {String[]} fields An array of field names whose values should be captured (e.g. 'PID', 'SCH.5', or 'MSH.5.1')
 * @param {String[]} captures An array to append captured values to
 * @param {String[]} ignores (optional) An array of fields to *completely* ignore (e.g. 'MSH', 'PID.5')
 *        NOTE: You can't (currently) ignore a field inside of one of the 'fields' you have already requested
 *
 * @returns Nothing
 */
function scan_node(node, fields, captures, ignores) {
  var nodeName = node.localName(); // nodeName is a js string

  if(fields.includes(nodeName)) {
    collect_node(node, captures);
  } else if(ignores && ignores.includes(nodeName)) {
    // Ignore this whole node and all its children
  } else {
    if(0 < node.children().length()) {
      for each (child in node.children()) {
        if('element' == child.nodeKind()) { // Only scan actual elements
          scan_node(child, fields, captures, ignores);

          if(0 == fields.length) {
            // No more fields to find; we are done
            return;
          }
        }
      }
    }
  }
}

/**
 * Captures all field values for the current node and its children.
 *
 * @param {XML} msg An XML object representing HL7.
 * @param {String[]} captures An array to append captured values to
 *
 * @returns Nothing
 */
function collect_node(node, captures) {
  if('element' == node.nodeKind() && 0 < node.children().length()) {
    for each (child in node.children()) {
      if('element' == node.nodeKind()) { // Only process actual elements
        collect_node(child, captures);
      }
    }
  } else {
    var value = node.toString(); // value is a js string
    if(0 < value.length) {
      captures.push(value);
    }
  }
}

