import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

function App() {
  const [status, setStatus] = useState('Đang kiểm tra...');

  useEffect(() => {
    fetch('/api/health')
      .then((response) => {
        if (!response.ok) throw new Error('API không phản hồi');
        return response.json();
      })
      .then((data) => setStatus(data.status === 'ok' ? 'Hoạt động bình thường' : 'Có lỗi'))
      .catch(() => setStatus('Không kết nối được API'));
  }, []);

  return (
    <main>
      <h1>Ứng dụng của CrouAn244</h1>
      <p>Trạng thái API: {status}</p>
      <p>Ứng dụng React được biên dịch trước khi đóng gói image.</p>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
