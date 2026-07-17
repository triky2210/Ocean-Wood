// Khởi tạo kết nối Supabase Client
const SUPABASE_URL = 'https://opjdsamkemqhwumvatbo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wamRzYW1rZW1xaHd1bXZhdGJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQyNzIzOTIsImV4cCI6MjA5OTg0ODM5Mn0.Gmq2b_1SBIAroiwOwFAytAZTj4a_rRgWa8s3Yp_Vr0g';

let supabaseClient = null;

try {
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } else {
        console.error("Không thể tải thư viện Supabase JS từ CDN.");
    }
} catch (error) {
    console.error("Lỗi khi kết nối với Supabase:", error);
}
