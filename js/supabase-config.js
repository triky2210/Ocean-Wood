// Khởi tạo kết nối Supabase Client
// QUAN TRỌNG: Bạn hãy thay thế các giá trị dưới đây bằng thông số dự án Supabase của bạn
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

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
