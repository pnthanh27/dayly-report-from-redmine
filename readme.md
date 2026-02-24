1 mô tả: đây là tool gửi mail báo cáo công việc công việc hoạn thành sẽ lấy từ https://xxxx/redmine/login sau đó gửi mail đến email của dự án từ email của tôi.

2 input:
    - file project.json chưa thông tin dự án:
        {
            "{code dự án}": {
                "link_log_task": "link log task",
                "to": "email người nhận",
                "from": "email người gửi",
                "subject": "tiêu đề mail",
                "dear": "người nhận",
                "issue_action": ["các vấn đề chưa giải quyết 1 ",...],
                "next_plan": ["kế hoạch tiếp theo 1 ",...],
            }
        }
    - file template.txt chưa nội dung template mail:
        Dear {{dear}},
        Em xin gửi báo cáo công việc:

        1. Actual Task & Progress
        {{actual_task}}

        2. Issue & Action:
        {{issue_action}}

        3. Next Plan:
        {{next_plan}}
    - file .env chưa thông tin gmail của tôi để sử dụng api gửi mail:
        EMAIL_HOST=smtp.gmail.com
        EMAIL_PORT=587
        EMAIL_USER=email của tôi
        EMAIL_PASSWORD=password của tôi

    
3 khái quát xử lý: 
    - sử dụng puppeteer để vào link log task (ví dụ: https://xxxx/redmine/projects/xxxx/time_entries) và lấy thông tin đã được log trong ngày hiện tại các thông tin cần lấy cột Issue chi tiết phần này tôi sẽ xử lý thêm bạn chị cần viết base thôi
    - khi đã lấy được data từ link log task (actual_task) thì sẽ xử lý để tạo nội dung gửi mail theo template.txt và gửi mail đến email của dự án từ email của tôi
4 Cách chạy:
    - Chạy cho ngày hiện tại: `node index.js` hoặc `node index.js now`
    - Chạy cho một ngày cụ thể: `node index.js YYYY-MM-DD` (Ví dụ: `node index.js 2026-02-23`)