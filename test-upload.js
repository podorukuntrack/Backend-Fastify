async function testUpload() {
  try {
    const loginRes = await fetch('http://localhost:3001/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@podorukun.com', password: 'password123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.data.accessToken;
    
    const unitsRes = await fetch('http://localhost:3001/api/v1/units?limit=1', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const unitsData = await unitsRes.json();
    const unitId = unitsData.data[0].id;
    
    const fd = new FormData();
    fd.append('unitId', unitId);
    fd.append('jenis', 'dokumen');
    
    // Create Blob from string
    const fileBlob = new Blob(['This is a test upload'], { type: 'text/plain' });
    fd.append('file', fileBlob, 'dummy.txt');
    
    const uploadRes = await fetch('http://localhost:3001/api/v1/documentations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: fd
    });
    
    console.log("Status:", uploadRes.status);
    console.log("Response:", await uploadRes.text());
    
  } catch (err) {
    console.error("Error:", err.message);
  }
}

testUpload();
