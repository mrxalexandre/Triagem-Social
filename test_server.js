import http from 'http';
http.get('http://localhost:3000', (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  res.on('data', (chunk) => {
    console.log(`BODY: ${chunk.toString('utf8').substring(0, 100)}`);
  });
}).on('error', (e) => {
  console.error(`Got error: ${e.message}`);
});
