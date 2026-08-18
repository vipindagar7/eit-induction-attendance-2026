import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    vus: 500,
    duration: '60s',
};

export default function () {
    const mobile = `9${Math.floor(100000000 + Math.random() * 899999999)}`;

    // 1. Send OTP
    const sendRes = http.post(
        'https://attendance.eitfaridabad.co.in/api/otp/send',
        JSON.stringify({ mobile }),
        { headers: { 'Content-Type': 'application/json' } }
    );
    check(sendRes, { 'otp sent': (r) => r.status === 200 });

    sleep(1);

    // 2. Verify OTP (dev mode code, set OTP_DEV_MODE=true on a staging env for this test)
    const verifyRes = http.post(
        'https://attendance.eitfaridabad.co.in/api/otp/verify',
        JSON.stringify({ mobile, otp: '123456' }),
        { headers: { 'Content-Type': 'application/json' } }
    );
    check(verifyRes, { 'otp verified': (r) => r.status === 200 });

    // 3. Submit attendance
    const submitRes = http.post(
        'https://attendance.eitfaridabad.co.in/api/attendance',
        JSON.stringify({
            name: 'Load Test User',
            fatherName: 'Test Father',
            mobile,
            branch: 'Computer Science & Engineering',
            otpVerified: true,
        }),
        { headers: { 'Content-Type': 'application/json' } }
    );
    check(submitRes, { 'attendance saved': (r) => r.status === 201 });
}