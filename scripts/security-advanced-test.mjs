// scripts/security-advanced-test.mjs
import { validatePasswordStrength, checkRateLimit, validateUploadedFile, detectSuspiciousInjection } from '../src/lib/auth/security.js';

console.log('Testing Advanced Security Validators...');

// 1. Password Complexity
const weakPass = validatePasswordStrength('weak');
console.log('Weak password rejected:', !weakPass.valid, weakPass.errors);
const strongPass = validatePasswordStrength('SolarEnterprise@2026!');
console.log('Strong password accepted:', strongPass.valid);

// 2. Injection Detection
const sqliAttempt = detectSuspiciousInjection("1' OR '1'='1");
console.log('SQL Injection detected:', sqliAttempt);
const xssAttempt = detectSuspiciousInjection("<script>alert('pwned')</script>");
console.log('XSS attempt detected:', xssAttempt);
const benignInput = detectSuspiciousInjection("5.5 kW Rooftop Solar System");
console.log('Benign input permitted:', !benignInput);

// 3. File Upload Validator
const dangerousFile = validateUploadedFile({ name: 'shell.php', size: 1024, type: 'application/x-php' });
console.log('Malicious executable rejected:', !dangerousFile.valid, dangerousFile.error);
const validDoc = validateUploadedFile({ name: 'electricity_bill.pdf', size: 2 * 1024 * 1024, type: 'application/pdf' });
console.log('Valid document approved:', validDoc.valid);

console.log('\nAll security unit checks verified!');
