var conduitUri = process.argv[2],
    spawn = require('child_process').spawn,
    whoami = spawn('arc', ['call-conduit', '--conduit-uri=' + conduitUri, 'user.whoami']),
    query = spawn('arc', ['call-conduit', '--conduit-uri=' + conduitUri, 'differential.query']),
    querydiffs = spawn('arc', ['call-conduit', '--conduit-uri=' + conduitUri, 'differential.querydiffs']),
    whoamiData = '', queryData = '', queryDiffData = '';

whoami.stdout.on('data', function(data) {
  whoamiData = whoamiData + data;
});

query.stdout.on('data', function(data) {
  queryData = queryData + data;
});

querydiffs.stdout.on('data', function(data) {
  queryDiffData = queryDiffData + data;
});

whoami.on('close', function(code) {
  if (code !== 0) {
    console.log('whoami process exited with code ' + code);
  }
  var phid = JSON.parse(whoamiData).response.phid;
  query.stdin.write(JSON.stringify({authors: [phid]}));
  query.stdin.end();
});

query.on('close', function(code) {
  if (code !== 0) {
    console.log('diffs process exited with code ' + code);
  }
  var qData = JSON.parse(queryData);
  var ids = [];
  var linecount = 0;
  var diffcount = 0;
  for (var i in qData.response) {
    var diff = qData.response[i];
    ids.push(diff.id);
    linecount = linecount + parseInt(diff.lineCount);
    diffcount = diffcount + 1;
  }
  console.log('Diff count: ' + diffcount);
  //console.log('Line count: ' + linecount);
  querydiffs.stdin.write(JSON.stringify({revisionIDs: ids}));
  querydiffs.stdin.end();
});

querydiffs.on('close', function(code) {
  if (code !== 0) {
    console.log('querydiffs process exited with code ' + code);
  }
  var qDData = JSON.parse(queryDiffData);
  var added = 0;
  var removed = 0;
  for (var i in qDData.response) {
    var diff = qDData.response[i];
    if (diff.creationMethod === 'commit') {
      for (var j in diff.changes) {
        added = added + parseInt(diff.changes[j].addLines, 10);
        removed = removed + parseInt(diff.changes[j].delLines, 10);
      }
    }
  }
  console.log('Added: ' + added + ' Removed: ' + removed);
});

whoami.stdin.write(JSON.stringify({}));
whoami.stdin.end();
