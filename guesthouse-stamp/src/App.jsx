import React, { useState, useEffect, useMemo } from 'react';
import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  updateDoc
} from 'firebase/firestore';
import {
  Feather,
  Clock,
  Search,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Printer,
  Phone,
  User,
  Trash2,
  LogOut,
  Lock,
  Sparkles,
  Calendar,
  Award,
  Globe
} from 'lucide-react';

// [커스텀 이미지 설정]
// public 폴더에 직접 만든 이미지를 넣고 경로(예: "/my-header.png")를 적으면 기본 일러스트 대신 해당 이미지가 표시됩니다.
const CUSTOM_HEADER_IMAGE = "";

// 2026.11.1 ~ 2027.4.30 기간 내 법정 공휴일 목록 (체크아웃 날짜 기준)
const DEFAULT_HOLIDAYS = [
  { date: '2026-12-25', name: '크리스마스', nameEn: 'Christmas' },
  { date: '2027-01-01', name: '신정', nameEn: "New Year's Day" },
  { date: '2027-02-06', name: '설날 연휴', nameEn: 'Lunar New Year Holiday' },
  { date: '2027-02-07', name: '설날', nameEn: "Lunar New Year's Day" },
  { date: '2027-02-08', name: '설날 연휴', nameEn: 'Lunar New Year Holiday' },
  { date: '2027-02-09', name: '대체공휴일(설날)', nameEn: 'Substitute Holiday' },
  { date: '2027-03-01', name: '삼일절', nameEn: 'Independence Movement Day' }
];

const DAY_NAMES_KO = ['일', '월', '화', '수', '목', '금', '토'];
const DAY_NAMES_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// 한국어 / 영어 다국어 사전
const I18N = {
  ko: {
    badge: '삼호대숲 철새마을',
    guesthouse: '삼호철새마을 게스트하우스',
    heroTitle: '대숲에 머무는 열 번의 쉼표',
    timeRange: '적립시간 15:00 ~ 익일 11:00',
    breakTitle: '객실 정비 및 준비 시간 (11:00 ~ 15:00)',
    breakReason: '스탬프 적립은 입실(15:00)부터 다음 날 퇴실(11:00) 사이에만 가능합니다.',
    offSeasonTitle: '평일 스탬프 이벤트 기간 외',
    offSeasonReason: '이 이벤트는 철새 도래기인 11월 1일부터 4월 30일까지 운영됩니다.',
    holidayTitle: (hName) => `공휴일 전날 입실 제외 (${hName})`,
    holidayReason: (date) => `퇴실일(${date})이 법정 공휴일이므로 이번 숙박은 평일 적립에서 제외됩니다.`,
    weekendTitle: '주말 숙박 적립 제외',
    weekendReason: (inDay, outDay) => `${inDay}요일 입실(${outDay}요일 퇴실)은 주말 숙박으로 적립 대상이 아닙니다.`,
    okTitle: '오늘의 철새 스탬프 적립 가능',
    okReason: (date, inDay) => `${date}(${inDay}) 평일 입실 고객님, 성함과 연락처를 입력하시면 즉시 1회가 적립됩니다.`,
    formTitle: '스탬프북 열기 및 적립',
    formDesc: '예약하신 성함과 연락처를 입력하시면 자동으로 도장이 찍힙니다.',
    nameLabel: '예약자 성함',
    namePlaceholder: '성함을 입력해주세요',
    phoneLabel: '휴대폰 번호',
    phonePlaceholder: '010-1234-5678',
    submitStamp: '오늘의 철새 스탬프 찍기',
    submitView: '내 스탬프북 조회하기',
    loading: '확인 중...',
    inputError: '예약자 성함과 휴대폰 번호를 정확히 입력해주세요.',
    alreadyStamped: (date) => `이번 숙박(${date} 입실) 스탬프는 이미 도장이 찍혔습니다. (1박 1회)`,
    rewardEarned: '축하합니다! 10번의 여정을 모두 채워 [평일 1박 무료 숙박권]이 발급되었습니다.',
    stampSuccess: (date, inDay) => `${date}(${inDay}요일 입실) 삼호대숲 철새 도장이 찍혔습니다!`,
    dbError: '데이터베이스 연결 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    travelerBadge: '삼호의 반가운 손님',
    bookOwner: (name) => `${name}님의 스탬프북`,
    changeNumber: '다른 번호 조회',
    voucherBadge: (count) => `무료 숙박권 (${count}매 보유)`,
    voucherTitle: '삼호철새마을 평일 1박 무료 숙박권',
    voucherDesc: '다음 평일 숙박 예약 시 관리자에게 이 화면을 보여주세요.',
    voucherNumber: '발급번호',
    boardSub: '평일 숙박 적립 현황',
    boardTitle: '삼호대숲 열 번의 발자취',
    unitCount: '회',
     stampedLabel: '적립완료',
    freeStayGoal: '무료숙박',
    remainText: (remain) => `${remain}번 더 머무르시면 평일 1박 무료 숙박권이 발급됩니다.`,
    historyTitle: '최근 머문 입실일 기록',
    footerText: '삼호철새마을 게스트하우스 · 11. 1. ~ 4. 30. 평일 숙박 이벤트'
  },
  en: {
    badge: 'Samho Migratory Bird Village',
    guesthouse: 'Samho Bird Village Guesthouse',
    heroTitle: 'Ten Peaceful Nights in the Bamboo Forest',
    timeRange: 'Available 15:00 ~ Next Day 11:00',
    breakTitle: 'Room Cleaning Hours (11:00 ~ 15:00)',
    breakReason: 'Stamps can only be collected between Check-in (15:00) and Check-out (11:00 the next day).',
    offSeasonTitle: 'Out of Event Season',
    offSeasonReason: 'This weekday event runs from November 1 to April 30 during the migratory bird season.',
    holidayTitle: (hName) => `Holiday Eve Excluded (${hName})`,
    holidayReason: (date) => `Because your check-out date (${date}) is a public holiday, this stay is excluded from weekday rewards.`,
    weekendTitle: 'Weekend Stay Excluded',
    weekendReason: (inDay, outDay) => `${inDay} check-in (${outDay} check-out) is a weekend stay and is not eligible for stamps.`,
    okTitle: 'Weekday Stamp Available Now',
    okReason: (date, inDay) => `Eligible weekday stay (${date}, ${inDay}). Enter your name and phone number to collect 1 stamp automatically.`,
    formTitle: 'Open Stamp Book & Collect',
    formDesc: 'Enter your reservation name and phone number to get stamped automatically.',
    nameLabel: 'Guest Name',
    namePlaceholder: 'Enter your name',
    phoneLabel: 'Phone Number',
    phonePlaceholder: '010-1234-5678',
    submitStamp: 'Collect Today’s Bird Stamp',
    submitView: 'View My Stamp Book',
    loading: 'Checking...',
    inputError: 'Please enter both your name and a valid 11-digit phone number.',
    alreadyStamped: (date) => `You have already collected a stamp for this stay (Check-in: ${date}). (Limit: 1 per night)`,
    rewardEarned: 'Congratulations! You have completed 10 stays and earned a [1-Night Free Weekday Voucher]!',
    stampSuccess: (date, inDay) => `Stamp collected for your stay on ${date} (${inDay})!`,
    dbError: 'Connection error. Please try again in a moment.',
    travelerBadge: 'Samho Traveler',
    bookOwner: (name) => `${name}'s Stamp Book`,
    changeNumber: 'Switch Account',
    voucherBadge: (count) => `Free Night Voucher (${count} Available)`,
    voucherTitle: '1-Night Free Weekday Stay Voucher',
    voucherDesc: 'Please present this voucher screen to the host when booking your next weekday stay.',
    voucherNumber: 'Code',
    boardSub: 'Weekday Stay Progress',
    boardTitle: 'Ten Footsteps in Samho Bamboo Grove',
    unitCount: 'Stays',
    stampedLabel: 'DONE',
    freeStayGoal: 'FREE NIGHT',
    remainText: (remain) => `Stay ${remain} more weekday night(s) to unlock a 1-Night Free Stay Voucher.`,
    historyTitle: 'Recent Check-in History',
    footerText: 'Samho Bird Village Guesthouse · Nov 1 – Apr 30 Weekday Event'
  }
};

const formatDateStr = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// [정밀 수묵 판화풍 SVG] S자 목과 부리, 다리, 날개깃이 살아있는 백로 & 떼까마귀 군무
const SamhoArtHeader = () => {
  if (CUSTOM_HEADER_IMAGE) {
    return (
      <img
        src={CUSTOM_HEADER_IMAGE}
        alt="삼호철새마을 게스트하우스"
        className="w-full h-full object-cover"
      />
    );
  }

  return (
    <svg
      viewBox="0 0 420 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full object-cover"
    >
      <defs>
        <linearGradient id="nightSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0E1512" />
          <stop offset="60%" stopColor="#192C22" />
          <stop offset="100%" stopColor="#243D30" />
        </linearGradient>
        <radialGradient id="fullMoon" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFDF7" />
          <stop offset="80%" stopColor="#EFECE1" />
          <stop offset="100%" stopColor="#DCE3DC" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 깊은 대숲 밤하늘 배경 */}
      <rect width="420" height="200" fill="url(#nightSky)" />

      {/* 달무리와 보름달 */}
      <circle cx="322" cy="64" r="48" fill="#F7F5F0" fillOpacity="0.06" />
      <circle cx="322" cy="64" r="33" fill="#FFFDF7" fillOpacity="0.94" />

      {/* 멀리 겹쳐진 태화강 수변 산세 */}
      <path
        d="M0 156 Q85 130 185 148 T420 135 L420 200 L0 200 Z"
        fill="#14241B"
        fillOpacity="0.85"
      />
      <path
        d="M0 170 Q140 152 270 166 T420 158 L420 200 L0 200 Z"
        fill="#0D1812"
      />

      {/* 좌측 & 우측 삼호대숲 대나무 줄기와 댓잎 디테일 */}
      <g stroke="#08100C" strokeWidth="2.8" strokeLinecap="round">
        <path d="M22 200 Q26 110 34 10" />
        <path d="M42 200 Q48 120 62 28" />
        <path d="M60 200 Q58 135 68 65" />
        <path d="M392 200 Q384 120 374 22" />
        <path d="M406 200 Q398 130 392 50" />
      </g>
      {/* 대나무 마디와 댓잎 */}
      <g fill="#08100C">
        <path d="M31 46 C48 40, 62 42, 74 50 C58 53, 44 51, 31 46 Z" />
        <path d="M30 50 C44 52, 54 58, 62 66 C48 63, 38 57, 30 50 Z" />
        <path d="M28 82 C14 75, 4 77, -4 84 C8 87, 19 86, 28 82 Z" />
        <path d="M54 74 C72 67, 86 70, 96 78 C80 80, 66 79, 54 74 Z" />
        <path d="M64 106 C80 100, 92 103, 100 110 C86 112, 74 110, 64 106 Z" />
        <path d="M378 58 C360 52, 348 55, 338 63 C352 65, 366 63, 378 58 Z" />
        <path d="M382 92 C365 86, 353 89, 344 96 C358 98, 370 96, 382 92 Z" />
      </g>

      {/* 은은한 비취색 대숲 뒷배경 잎사귀 */}
      <g fill="#2F5943" opacity="0.55">
        <path d="M68 88 C86 80, 100 83, 110 91 C94 94, 80 92, 68 88 Z" />
        <path d="M48 118 C65 112, 78 115, 86 122 C72 124, 58 122, 48 118 Z" />
        <path d="M375 74 C358 68, 344 71, 335 79 C350 81, 364 79, 375 74 Z" />
      </g>

      {/* [떼까마귀 군무] 보름달 주변을 나는 먹색 까마귀 실루엣 (날개짓 각도 변화) */}
      <g fill="#101613">
        {/* 달 안쪽을 지나는 까마귀 */}
        <path d="M298 54 C304 46, 312 45, 318 51 C320 49, 323 49, 325 51 C331 45, 339 46, 345 54 C336 51, 328 53, 322 57 L319 60 L317 57 C311 53, 304 51, 298 54 Z" />
        {/* 달 왼쪽 위 까마귀 */}
        <path d="M258 36 C263 29, 270 28, 275 33 C280 28, 287 29, 292 36 C284 33, 278 35, 275 39 C272 35, 266 33, 258 36 Z" />
        {/* 달 오른쪽 위 작은 까마귀들 */}
        <path d="M336 33 C340 28, 345 28, 349 32 C353 28, 358 28, 362 33 C356 31, 352 33, 349 36 C346 33, 342 31, 336 33 Z" />
        <path d="M232 52 C236 48, 240 48, 244 51 C248 48, 252 48, 256 52 C251 50, 247 52, 244 54 C241 52, 237 50, 232 52 Z" opacity="0.85" />
      </g>

      {/* [메인 백로(Egret) 일러스트] 긴 목과 뾰족한 부리, 유려한 날개깃과 뒤로 뻗은 두 다리 */}
      <g>
        {/* 백로 본체 및 큰 날개 (순백색) */}
        <path
          d="M118 82
             C132 58, 156 46, 180 56
             C168 38, 182 22, 204 20
             C196 30, 194 44, 198 56
             C207 55, 214 50, 219 45
             C223 41, 227 40, 233 41
             L248 42
             L234 45
             C229 46, 226 49, 222 54
             C216 61, 207 66, 194 67
             C182 68, 169 72, 156 80
             L130 88
             L146 80
             C136 81, 126 82, 118 82 Z"
          fill="#FFFDF9"
        />
        {/* 백로 아래쪽 날개와 날개깃 결 */}
        <path
          d="M166 64 C152 78, 142 94, 136 108 C152 96, 168 82, 184 68 Z"
          fill="#E5ECE7"
        />
        {/* 뒤로 길게 뻗은 백로의 다리 */}
        <path
          d="M154 76 L112 91 M150 79 L116 95"
          stroke="#DCE5DF"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        {/* 백로 부리 끝 포인트 */}
        <path d="M233 41 L251 42 L234 44 Z" fill="#E8B966" />
      </g>

      {/* 두 번째 작은 백로 (원경) */}
      <g opacity="0.9">
        <path
          d="M78 112 C88 98, 102 92, 115 98 C109 87, 118 77, 131 76 C126 82, 125 90, 128 97 C134 96, 139 92, 144 92 L153 93 L144 95 C138 96, 133 101, 124 103 C114 105, 102 109, 92 115 Z"
          fill="#F7F5F0"
        />
      </g>

      {/* 강물 위 달빛 윤슬 */}
      <g stroke="#FFFDF7" strokeOpacity="0.22" strokeWidth="1.2" strokeLinecap="round">
        <line x1="285" y1="176" x2="345" y2="176" />
        <line x1="298" y1="183" x2="335" y2="183" />
        <line x1="140" y1="186" x2="195" y2="186" />
      </g>
    </svg>
  );
};

// 스탬프 칸 안에 들어갈 작은 백로 심볼 SVG
const MiniHeronIcon = ({ className = "w-5 h-5" }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className}>
    <path
      d="M4 18 C8 11, 14 9, 19 12 C16 7, 20 3, 25 3 C23 6, 22 10, 24 13 C26 13, 28 11, 30 11 L27 13 C25 15, 22 17, 18 17 C14 18, 9 20, 4 18 Z"
      fill="currentColor"
    />
  </svg>
);

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const isAdminParam = urlParams.get('admin') === 'true';

  // 언어 상태 ('ko' 기본 한국어 | 'en' 영어)
  const [lang, setLang] = useState('ko');
  const t = I18N[lang];

  // 관리자 상태
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [adminPinError, setAdminPinError] = useState(false);
  const [adminSubTab, setAdminSubTab] = useState('list'); // 'list' | 'poster'
  const [posterLang, setPosterLang] = useState('ko'); // 'ko' | 'en' | 'both'

  // 손님용 상태
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [myCustomerId, setMyCustomerId] = useState(() => localStorage.getItem('samho_guest_id') || null);
  const [myCustomerData, setMyCustomerData] = useState(null);
  const [message, setMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 관리자 데이터 상태
  const [customersList, setCustomersList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [holidays, setHolidays] = useState(DEFAULT_HOLIDAYS);
  const [newHDate, setNewHDate] = useState('');
  const [newHName, setNewHName] = useState('');

  // 현재 실제 시간
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  // [시간 및 요일 판별 로직] 15:00 ~ 익일 11:00 허용 / 11:00~15:00 정비시간 차단
  const stayValidation = useMemo(() => {
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const totalMinutes = currentHours * 60 + currentMinutes;

    const CHECKIN_TIME = 15 * 60; // 15:00
    const CHECKOUT_TIME = 11 * 60; // 11:00

    let checkInDateObj = new Date(now);
    let checkOutDateObj = new Date(now);
    let isTimeAllowed = false;

    if (totalMinutes >= CHECKIN_TIME) {
      isTimeAllowed = true;
      checkOutDateObj.setDate(checkOutDateObj.getDate() + 1);
    } else if (totalMinutes <= CHECKOUT_TIME) {
      isTimeAllowed = true;
      checkInDateObj.setDate(checkInDateObj.getDate() - 1);
    } else {
      isTimeAllowed = false;
    }

    const checkInDateStr = formatDateStr(checkInDateObj);
    const checkOutDateStr = formatDateStr(checkOutDateObj);
    const checkInDayIdx = checkInDateObj.getDay();
    const dayNames = lang === 'ko' ? DAY_NAMES_KO : DAY_NAMES_EN;
    const checkInDayName = dayNames[checkInDayIdx];
    const checkOutDayName = dayNames[checkOutDateObj.getDay()];

    if (!isTimeAllowed) {
      return {
        canStamp: false,
        title: t.breakTitle,
        reason: t.breakReason
      };
    }

    // 1. 이벤트 시즌 검사 (11. 1. ~ 4. 30.)
    const checkInMonth = checkInDateObj.getMonth() + 1;
    if (!(checkInMonth >= 11 || checkInMonth <= 4)) {
      return {
        canStamp: false,
        title: t.offSeasonTitle,
        reason: t.offSeasonReason
      };
    }

    // 2. 체크아웃 날 공휴일 검사
    const matchedHoliday = holidays.find((h) => h.date === checkOutDateStr);
    if (matchedHoliday) {
      const hLabel = lang === 'ko' ? matchedHoliday.name : (matchedHoliday.nameEn || matchedHoliday.name);
      return {
        canStamp: false,
        title: t.holidayTitle(hLabel),
        reason: t.holidayReason(checkOutDateStr)
      };
    }

    // 3. 평일 입실 요일 검사 (일~목 입실 허용)
    if (![0, 1, 2, 3, 4].includes(checkInDayIdx)) {
      return {
        canStamp: false,
        title: t.weekendTitle,
        reason: t.weekendReason(checkInDayName, checkOutDayName)
      };
    }

    return {
      canStamp: true,
      checkInDateStr,
      checkInDayName,
      checkOutDateStr,
      checkOutDayName,
      title: t.okTitle,
      reason: t.okReason(checkInDateStr, checkInDayName)
    };
  }, [now, holidays, lang, t]);

  // Firestore 실시간 손님 데이터 구독
  useEffect(() => {
    if (!myCustomerId) return;
    const unsub = onSnapshot(doc(db, 'customers', myCustomerId), (docSnap) => {
      if (docSnap.exists()) {
        setMyCustomerData(docSnap.data());
      }
    });
    return () => unsub();
  }, [myCustomerId]);

  // 관리자 모드: 전체 고객 목록 구독
  useEffect(() => {
    if (!isAdminParam || !isAdminUnlocked) return;
    const unsub = onSnapshot(collection(db, 'customers'), (snapshot) => {
      const list = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.lastStampedDate || '').localeCompare(a.lastStampedDate || ''));
      setCustomersList(list);
    });
    return () => unsub();
  }, [isAdminParam, isAdminUnlocked]);

  const formatPhone = (val) => {
    const nums = val.replace(/[^\d]/g, '').slice(0, 11);
    if (nums.length <= 3) return nums;
    if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
    return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
  };

  // 손님 스탬프 적립 및 조회 핸들러
  const handleGuestSubmit = async (e) => {
    e.preventDefault();
    const name = guestName.trim();
    const phone = guestPhone.trim();

    if (!name || phone.length < 12) {
      setMessage({ type: 'error', text: t.inputError });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const docId = phone.replace(/[^0-9]/g, '');

    try {
      const userRef = doc(db, 'customers', docId);
      const userSnap = await getDoc(userRef);

      let userData = userSnap.exists()
        ? userSnap.data()
        : {
            name,
            phone,
            stamps: 0,
            coupons: 0,
            usedCoupons: 0,
            couponCode: null,
            lastStampedDate: null,
            history: []
          };

      if (!stayValidation.canStamp) {
        setMyCustomerId(docId);
        setMyCustomerData(userData);
        localStorage.setItem('samho_guest_id', docId);
        setMessage({ type: 'info', text: stayValidation.reason });
        setIsSubmitting(false);
        return;
      }

      if (userData.lastStampedDate === stayValidation.checkInDateStr) {
        setMyCustomerId(docId);
        setMyCustomerData(userData);
        localStorage.setItem('samho_guest_id', docId);
        setMessage({
          type: 'info',
          text: t.alreadyStamped(stayValidation.checkInDateStr)
        });
        setIsSubmitting(false);
        return;
      }

      const nextStamps = (userData.stamps || 0) + 1;
      const isReward = nextStamps >= 10;
      const newCouponCode = isReward
        ? `SAMHO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
        : userData.couponCode;

      userData = {
        ...userData,
        name,
        phone,
        stamps: isReward ? nextStamps - 10 : nextStamps,
        coupons: isReward ? (userData.coupons || 0) + 1 : userData.coupons || 0,
        couponCode: newCouponCode,
        lastStampedDate: stayValidation.checkInDateStr,
        history: [...(userData.history || []), stayValidation.checkInDateStr]
      };

      await setDoc(userRef, userData, { merge: true });

      setMyCustomerId(docId);
      setMyCustomerData(userData);
      localStorage.setItem('samho_guest_id', docId);

      if (isReward) {
        setMessage({
          type: 'reward',
          text: t.rewardEarned
        });
      } else {
        setMessage({
          type: 'success',
          text: t.stampSuccess(stayValidation.checkInDateStr, stayValidation.checkInDayName)
        });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: t.dbError });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 관리자 핸들러
  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPin === '0000') {
      setIsAdminUnlocked(true);
      setAdminPinError(false);
    } else {
      setAdminPinError(true);
    }
  };

  const adjustStampsAdmin = async (id, currentStamps, delta) => {
    let next = currentStamps + delta;
    if (next < 0) next = 0;
    await updateDoc(doc(db, 'customers', id), { stamps: next });
  };

  const useCouponAdmin = async (id, currentCoupons, used) => {
    if (currentCoupons <= 0) return;
    await updateDoc(doc(db, 'customers', id), {
      coupons: currentCoupons - 1,
      usedCoupons: (used || 0) + 1
    });
  };

  const handleAddHoliday = (e) => {
    e.preventDefault();
    if (!newHDate || !newHName.trim()) return;
    if (holidays.some((h) => h.date === newHDate)) return;
    setHolidays([...holidays, { date: newHDate, name: newHName.trim(), nameEn: newHName.trim() }].sort((a, b) => a.date.localeCompare(b.date)));
    setNewHDate('');
    setNewHName('');
  };

  // ==========================================================
  // [모드 A] 사장님 관리자 및 포스터 인쇄 (?admin=true)
  // ==========================================================
  if (isAdminParam) {
    if (!isAdminUnlocked) {
      return (
        <div className="min-h-screen bg-[#111513] flex items-center justify-center p-4 text-stone-100">
          <div className="max-w-sm w-full bg-[#1A211E] p-8 rounded-3xl border border-stone-800 shadow-2xl text-center space-y-5">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-950 border border-emerald-800/60 text-emerald-300 flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-emerald-400 font-bold">삼호철새마을 게스트하우스</p>
              <h2 className="font-serif-kr text-xl font-bold text-white mt-1">관리자 전용 로그인</h2>
              <p className="text-xs text-stone-400 mt-1">비밀번호 4자리를 입력해주세요 (초기: 0000)</p>
            </div>
            <form onSubmit={handleAdminLogin} className="space-y-3">
              <input
                type="password"
                maxLength={4}
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                placeholder="••••"
                className="w-full text-center text-2xl font-mono tracking-widest py-3 bg-black/40 border border-stone-700 rounded-2xl text-emerald-300 focus:outline-none focus:border-emerald-500"
              />
              {adminPinError && <p className="text-xs text-rose-400">비밀번호가 일치하지 않습니다.</p>}
              <button
                type="submit"
                className="w-full py-3.5 bg-[#F7F5F0] hover:bg-white text-[#111513] font-extrabold rounded-2xl text-sm transition cursor-pointer"
              >
                관리자 화면 열기
              </button>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#F4F3EE] text-[#181C1A] p-6 max-w-5xl mx-auto space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-300 pb-5 print:hidden">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#141A17] text-[#F7F5F0] flex items-center justify-center shadow-md">
              <MiniHeronIcon className="w-6 h-6 text-stone-100" />
            </div>
            <div>
              <h1 className="font-serif-kr text-xl font-bold text-stone-900">삼호철새마을 게스트하우스 관리자</h1>
              <p className="text-xs text-emerald-800 font-semibold">실시간 스탬프북 적립 현황 및 객실 포스터 인쇄</p>
            </div>
          </div>
          <div className="flex bg-stone-200 p-1 rounded-2xl text-xs font-bold">
            <button
              onClick={() => setAdminSubTab('list')}
              className={`px-4 py-2.5 rounded-xl transition cursor-pointer ${
                adminSubTab === 'list' ? 'bg-[#141A17] text-white shadow-sm' : 'text-stone-600 hover:text-black'
              }`}
            >
              고객 적립 관리 ({customersList.length}명)
            </button>
            <button
              onClick={() => setAdminSubTab('poster')}
              className={`px-4 py-2.5 rounded-xl transition cursor-pointer ${
                adminSubTab === 'poster' ? 'bg-[#141A17] text-white shadow-sm' : 'text-stone-600 hover:text-black'
              }`}
            >
              객실 비치용 포스터 인쇄
            </button>
          </div>
        </header>

        {adminSubTab === 'list' ? (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div>
                  <h2 className="font-serif-kr font-bold text-stone-900 text-lg">숙박객 스탬프 적립 명단</h2>
                  <p className="text-xs text-stone-500">손님이 객실 QR로 적립하면 실시간으로 반영됩니다.</p>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="성함 또는 연락처 검색"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border border-stone-300 rounded-xl pl-9 pr-4 py-2 text-xs w-64 focus:outline-none focus:border-emerald-800 bg-stone-50"
                  />
                </div>
              </div>

              <div className="divide-y divide-stone-100 text-xs">
                {customersList.length === 0 ? (
                  <p className="py-12 text-center text-stone-400">아직 등록된 손님이 없습니다.</p>
                ) : (
                  customersList
                    .filter((c) => (c.name || '').includes(searchQuery) || (c.phone || '').includes(searchQuery))
                    .map((c) => (
                      <div key={c.id} className="py-4 flex flex-wrap justify-between items-center gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-stone-900 text-sm">{c.name}</span>
                            <span className="text-stone-500 font-mono">{c.phone}</span>
                            {c.coupons > 0 && (
                              <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 font-bold rounded-full border border-amber-300">
                                무료숙박권 {c.coupons}장 ({c.couponCode})
                              </span>
                            )}
                          </div>
                          <p className="text-stone-400 text-[11px] mt-1">
                            최근 적립 입실일: {c.lastStampedDate || '없음'} · 누적 사용 쿠폰: {c.usedCoupons || 0}장
                          </p>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <div className="flex items-center bg-stone-100 rounded-xl p-1 border border-stone-200">
                            <button
                              onClick={() => adjustStampsAdmin(c.id, c.stamps, -1)}
                              className="p-1.5 hover:bg-white rounded-lg transition cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-3 font-black text-emerald-900">{c.stamps || 0} / 10회</span>
                            <button
                              onClick={() => adjustStampsAdmin(c.id, c.stamps, 1)}
                              className="p-1.5 hover:bg-white rounded-lg transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {c.coupons > 0 && (
                            <button
                              onClick={() => useCouponAdmin(c.id, c.coupons, c.usedCoupons)}
                              className="px-3.5 py-2 bg-[#141A17] hover:bg-emerald-950 text-white font-bold rounded-xl transition cursor-pointer"
                            >
                              숙박권 사용 완료
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* 공휴일 관리 */}
            <div className="bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-3">
              <h3 className="font-serif-kr font-bold text-stone-900 text-base">퇴실일 기준 공휴일 제외 설정</h3>
              <p className="text-xs text-stone-500">아래 날짜에 퇴실(체크아웃)하는 전날 입실객은 평일 적립에서 자동 제외됩니다.</p>
              <form onSubmit={handleAddHoliday} className="flex gap-2 text-xs">
                <input
                  type="date"
                  value={newHDate}
                  onChange={(e) => setNewHDate(e.target.value)}
                  className="border border-stone-300 rounded-xl px-3 py-2 bg-stone-50"
                />
                <input
                  type="text"
                  placeholder="공휴일 명칭 (예: 삼일절, 대체공휴일)"
                  value={newHName}
                  onChange={(e) => setNewHName(e.target.value)}
                  className="border border-stone-300 rounded-xl px-3 py-2 flex-1 bg-stone-50"
                />
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#141A17] text-white font-bold rounded-xl cursor-pointer"
                >
                  추가
                </button>
              </form>
              <div className="flex flex-wrap gap-2 pt-2">
                {holidays.map((h) => (
                  <span
                    key={h.date}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 rounded-xl text-xs text-stone-700 border border-stone-200"
                  >
                    <span className="font-mono font-bold">{h.date}</span> ({h.name})
                    <button
                      onClick={() => setHolidays(holidays.filter((item) => item.date !== h.date))}
                      className="text-stone-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* =================================================
             객실 액자형 A4 아트 포스터 (한국어 / 한영병기 선택 가능)
             ================================================= */
          <div className="space-y-5 text-center">
            <div className="print:hidden flex flex-wrap justify-center items-center gap-3">
              <div className="flex bg-stone-200 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setPosterLang('ko')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer ${posterLang === 'ko' ? 'bg-white text-black shadow-2xs' : 'text-stone-600'}`}
                >
                  순수 한국어 포스터
                </button>
                <button
                  onClick={() => setPosterLang('both')}
                  className={`px-3 py-1.5 rounded-lg cursor-pointer ${posterLang === 'both' ? 'bg-white text-black shadow-2xs' : 'text-stone-600'}`}
                >
                  한국어 + 영문 병기 포스터
                </button>
              </div>

              <button
                onClick={() => window.print()}
                className="px-6 py-2.5 bg-[#141A17] hover:bg-emerald-950 text-[#F7F5F0] font-bold rounded-xl text-xs shadow-lg cursor-pointer inline-flex items-center gap-2"
              >
                <Printer className="w-4 h-4 text-emerald-400" /> A4 포스터 인쇄하기
              </button>
            </div>

            {/* 실제 인쇄될 A4 프레임 */}
            <div className="max-w-[520px] mx-auto bg-[#F7F5F0] text-[#141A17] rounded-3xl overflow-hidden shadow-2xl border-2 border-[#141A17] print:shadow-none print:rounded-none">
              {/* 상단 갤러리 아트워크 영역 */}
              <div className="relative h-56 bg-[#121A16]">
                <SamhoArtHeader />
                <div className="absolute inset-0 flex flex-col justify-between p-7 text-left bg-gradient-to-t from-black/55 via-transparent to-black/20">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-emerald-200 bg-black/45 px-3 py-1 rounded-full border border-emerald-700/50">
                      태화강 삼호대숲
                    </span>
                    <span className="text-xs font-serif-kr text-stone-200">울산 삼호철새마을</span>
                  </div>
                  <div>
                    <p className="text-xs text-emerald-200 font-semibold">삼호철새마을 게스트하우스</p>
                    <h2 className="font-serif-kr text-3xl font-bold text-[#F7F5F0] tracking-tight mt-1">
                      철새 여정 스탬프북
                    </h2>
                    {posterLang === 'both' && (
                      <p className="text-xs text-stone-300 mt-0.5">
                        Samho Bird Village Guesthouse · Weekday Stamp Event
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 포스터 본문 */}
              <div className="p-8 space-y-6">
                <div className="space-y-1.5">
                  <span className="inline-block text-xs font-bold text-emerald-900 bg-emerald-100/80 px-3 py-0.5 rounded-full">
                    11월 1일 ~ 4월 30일 평일 숙박 이벤트
                  </span>
                  <h3 className="font-serif-kr text-xl font-bold text-[#141A17] leading-snug pt-1">
                    평일 열 번의 쉼표가 모이면,<br />
                    <span className="text-emerald-800 underline decoration-emerald-700/50 underline-offset-4">
                      평일 1박 무료 숙박권
                    </span>
                    을 선물합니다
                  </h3>
                  {posterLang === 'both' && (
                    <p className="text-xs text-stone-600 pt-0.5">
                      Stay 10 weekday nights (Sun–Thu) and get a 1-Night Free Weekday Voucher!
                    </p>
                  )}
                </div>

                {/* 중앙 QR 스캔 박스 */}
                <div className="relative bg-white p-6 rounded-3xl border border-stone-300 shadow-sm max-w-xs mx-auto">
                  <div className="p-3 bg-[#FBFBF9] rounded-2xl border border-dashed border-stone-300 inline-block">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                        window.location.origin
                      )}`}
                      alt="스탬프북 QR"
                      className="w-44 h-44 mx-auto"
                    />
                  </div>
                  <p className="font-serif-kr text-sm font-bold text-[#141A17] mt-3">
                    스마트폰 카메라로 QR코드를 스캔해주세요
                  </p>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    {posterLang === 'both'
                      ? 'Scan QR code & switch to English at the top right corner'
                      : '별도 앱 설치 없이 성함과 연락처만으로 즉시 적립됩니다'}
                  </p>
                </div>

                {/* 3단계 이용 방법 (순수 한국어) */}
                <div className="grid grid-cols-3 gap-2.5 text-center pt-1">
                  <div className="bg-white/90 p-3 rounded-2xl border border-stone-200">
                    <span className="text-[11px] font-extrabold text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      첫째
                    </span>
                    <p className="font-bold text-xs mt-1.5 text-stone-900">객실 QR 스캔</p>
                    <p className="text-[10px] text-stone-500 mt-0.5">스마트폰 카메라 실행</p>
                  </div>
                  <div className="bg-white/90 p-3 rounded-2xl border border-stone-200">
                    <span className="text-[11px] font-extrabold text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      둘째
                    </span>
                    <p className="font-bold text-xs mt-1.5 text-stone-900">예약자 정보 입력</p>
                    <p className="text-[10px] text-stone-500 mt-0.5">성함 · 연락처 입력</p>
                  </div>
                  <div className="bg-white/90 p-3 rounded-2xl border border-stone-200">
                    <span className="text-[11px] font-extrabold text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      셋째
                    </span>
                    <p className="font-bold text-xs mt-1.5 text-stone-900">10회 달성 혜택</p>
                    <p className="text-[10px] text-stone-500 mt-0.5">무료 숙박권 자동 발급</p>
                  </div>
                </div>

                {/* 하단 규정 안내 */}
                <div className="text-left text-[11px] text-stone-600 bg-[#EFECE4] p-4 rounded-2xl space-y-1 border border-stone-300/70">
                  <p className="font-bold text-stone-900 text-xs mb-1">스탬프 적립 규정 안내</p>
                  <p>• <strong>운영 기간:</strong> 매년 11월 1일 ~ 익년 4월 30일 (동절기 철새 도래 기간)</p>
                  <p>• <strong>적립 시간:</strong> 입실일 오후 3시(15:00)부터 다음 날 오전 11시(11:00) 사이에만 적립 가능</p>
                  <p>• <strong>적립 대상:</strong> 평일(일~목요일) 입실객 한정 (금·토 주말 및 공휴일 전날 입실 제외)</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================================
  // [모드 B] 손님용 스탬프북 (기본 100% 한국어 + 한/영 토글 스위치)
  // ==========================================================
  return (
    <div className="min-h-screen bg-[#0E1310] text-[#181C1A] flex flex-col justify-center items-center p-4 py-8 selection:bg-emerald-900 selection:text-white">
      <div className="w-full max-w-[420px] bg-[#F7F5F0] rounded-[32px] shadow-2xl overflow-hidden border border-stone-700/40">
        {/* 1. 상단 삼호대숲 & 백로·떼까마귀 일러스트 배너 */}
        <div className="relative h-52 bg-[#121A16]">
          <SamhoArtHeader />

          {/* 상단 바: 좌측 마을 배지 / 우측 한국어·ENG 전환 스위치 */}
          <div className="absolute top-4 left-5 right-5 flex justify-between items-center z-10">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-black/50 text-emerald-200 px-3 py-1 rounded-full border border-emerald-700/40 backdrop-blur-xs">
              <MiniHeronIcon className="w-3.5 h-3.5 text-white" /> {t.badge}
            </span>

            {/* 한/영 전환 버튼 */}
            <button
              type="button"
              onClick={() => {
                setLang((prev) => (prev === 'ko' ? 'en' : 'ko'));
                setMessage(null);
              }}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-black/60 hover:bg-black/80 text-stone-100 px-3 py-1 rounded-full border border-stone-500/50 backdrop-blur-xs cursor-pointer transition"
            >
              <Globe className="w-3 h-3 text-emerald-300" />
              <span className={lang === 'ko' ? 'text-emerald-300 font-extrabold' : 'text-stone-400'}>한국어</span>
              <span className="text-stone-600">|</span>
              <span className={lang === 'en' ? 'text-emerald-300 font-extrabold' : 'text-stone-400'}>ENG</span>
            </button>
          </div>

          {/* 하단 타이틀 오버레이 */}
          <div className="absolute bottom-0 inset-x-0 p-6 pt-10 bg-gradient-to-t from-[#0E1512]/90 via-[#0E1512]/40 to-transparent text-white">
            <div className="flex items-center justify-between text-xs text-emerald-200/95 font-medium">
              <span>{t.guesthouse}</span>
              <span className="text-[11px] text-stone-300">{t.timeRange}</span>
            </div>
            <h1 className="font-serif-kr text-2xl font-bold tracking-tight text-[#F7F5F0] mt-1">
              {t.heroTitle}
            </h1>
          </div>
        </div>

        {/* 2. 본문 한지 영역 */}
        <div className="p-6 space-y-5">
          {/* 현재 시간 기준 적립 상태 카드 */}
          <div
            className={`p-4 rounded-2xl text-xs flex items-start gap-3 border ${
              stayValidation.canStamp
                ? 'bg-[#E9F0EC] text-[#163022] border-[#BBD0C4]'
                : 'bg-[#EFECE4] text-stone-700 border-stone-300'
            }`}
          >
            {stayValidation.canStamp ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
            ) : (
              <Clock className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <p className="font-bold text-xs">{stayValidation.title}</p>
              <p className="text-[11px] opacity-85 leading-relaxed">{stayValidation.reason}</p>
            </div>
          </div>

          {/* 적립 완료/안내 토스트 메시지 */}
          {message && (
            <div
              className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2.5 border shadow-xs ${
                message.type === 'error'
                  ? 'bg-rose-50 text-rose-900 border-rose-200'
                  : message.type === 'reward'
                  ? 'bg-amber-50 text-amber-950 border-amber-400'
                  : message.type === 'success'
                  ? 'bg-[#162920] text-[#F7F5F0] border-emerald-800'
                  : 'bg-white text-stone-700 border-stone-200'
              }`}
            >
              {message.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : message.type === 'reward' ? (
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              )}
              <span className="leading-relaxed">{message.text}</span>
            </div>
          )}

          {/* [화면 분기 1] 로그인 전: 예약자 성함 + 전화번호 입력 */}
          {!myCustomerData ? (
            <form onSubmit={handleGuestSubmit} className="space-y-4">
              <div className="bg-white p-5 rounded-3xl border border-stone-200/90 shadow-xs space-y-4">
                <div className="border-b border-stone-100 pb-2.5">
                  <h2 className="font-serif-kr font-bold text-base text-stone-900">
                    {t.formTitle}
                  </h2>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    {t.formDesc}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    {t.nameLabel}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      placeholder={t.namePlaceholder}
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-[#F9F8F5] border border-stone-300 rounded-2xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#162920] focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    {t.phoneLabel}
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      placeholder={t.phonePlaceholder}
                      value={guestPhone}
                      onChange={(e) => setGuestPhone(formatPhone(e.target.value))}
                      className="w-full pl-10 pr-4 py-3 bg-[#F9F8F5] border border-stone-300 rounded-2xl text-sm text-stone-900 font-mono placeholder-stone-400 focus:outline-none focus:border-[#162920] focus:bg-white transition"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-[#141E19] hover:bg-[#1E2E26] text-[#F7F5F0] font-serif-kr font-bold rounded-2xl text-sm transition cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  t.loading
                ) : stayValidation.canStamp ? (
                  <>
                    <MiniHeronIcon className="w-5 h-5 text-emerald-300" />
                    {t.submitStamp}
                  </>
                ) : (
                  t.submitView
                )}
              </button>
            </form>
          ) : (
            /* [화면 분기 2] 로그인 후: 낙관(도장) 스타일 스탬프북 */
            <div className="space-y-5">
              {/* 여행자 프로필 바 */}
              <div className="flex justify-between items-center bg-white px-4 py-3.5 rounded-2xl border border-stone-200/80 shadow-2xs">
                <div>
                  <span className="text-[11px] font-bold text-emerald-800">
                    {t.travelerBadge}
                  </span>
                  <h3 className="font-serif-kr font-bold text-stone-900 text-base">
                    {t.bookOwner(myCustomerData.name)}
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setMyCustomerId(null);
                    setMyCustomerData(null);
                    localStorage.removeItem('samho_guest_id');
                  }}
                  className="text-xs text-stone-600 hover:text-stone-900 flex items-center gap-1 cursor-pointer bg-stone-100 px-3 py-1.5 rounded-xl font-medium"
                >
                  <LogOut className="w-3.5 h-3.5" /> {t.changeNumber}
                </button>
              </div>

              {/* 보유 무료 숙박권 바우처 */}
              {myCustomerData.coupons > 0 && (
                <div className="relative bg-[#141E19] text-[#F7F5F0] rounded-3xl p-5 shadow-xl overflow-hidden border border-emerald-800/50">
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#F7F5F0]"></div>
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#F7F5F0]"></div>

                  <div className="pl-2 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-bold bg-emerald-400/20 text-emerald-300 px-2.5 py-0.5 rounded-full">
                        {t.voucherBadge(myCustomerData.coupons)}
                      </span>
                      <span className="text-[11px] font-mono text-amber-300">
                        {t.voucherNumber}: {myCustomerData.couponCode}
                      </span>
                    </div>
                    <h4 className="font-serif-kr text-lg font-bold text-white pt-1">
                      {t.voucherTitle}
                    </h4>
                    <p className="text-[11px] text-stone-300">
                      {t.voucherDesc}
                    </p>
                  </div>
                </div>
              )}

              {/* 10칸 원형 낙관(도장) 스탬프 보드 */}
              <div className="bg-white p-5 rounded-3xl border border-stone-200/90 shadow-xs space-y-4">
                <div className="flex justify-between items-end border-b border-stone-100 pb-3">
                  <div>
                    <span className="text-[11px] font-bold text-stone-400">
                      {t.boardSub}
                    </span>
                    <h4 className="font-serif-kr font-bold text-sm text-stone-900 mt-0.5">
                      {t.boardTitle}
                    </h4>
                  </div>
                  <span className="font-serif-kr font-black text-base text-emerald-900">
                    {myCustomerData.stamps || 0}{' '}
                    <span className="text-xs font-normal text-stone-400">/ 10{t.unitCount}</span>
                  </span>
                </div>

                {/* 5x2 원형 인장 그리드 */}
                <div className="grid grid-cols-5 gap-3 py-1">
                  {Array.from({ length: 10 }).map((_, idx) => {
                    const currentStamps = myCustomerData.stamps || 0;
                    const isStamped = idx < currentStamps;
                    const isLastGoal = idx === 9;
                    const historyArr = myCustomerData.history || [];
                    const stampedDate =
                      historyArr[historyArr.length - currentStamps + idx];

                    return (
                      <div key={idx} className="flex flex-col items-center">
                        <div
                          className={`w-13 h-13 rounded-full flex flex-col items-center justify-center transition-all duration-300 relative ${
                            isStamped
                              ? 'bg-[#141E19] text-[#F7F5F0] border-2 border-[#141E19] shadow-md -rotate-6'
                              : isLastGoal
                              ? 'bg-amber-50/70 border-2 border-dashed border-amber-400 text-amber-800'
                              : 'bg-[#F9F8F5] border border-dashed border-stone-300 text-stone-400'
                          }`}
                        >
                          {isStamped ? (
                            <>
                              <MiniHeronIcon className="w-5 h-5 text-emerald-300" />
                              <span className="text-[8px] font-mono font-bold tracking-tighter text-stone-200">
                                {stampedDate ? stampedDate.slice(5).replace('-', '.') : t.stampedLabel}
                              </span>
                            </>
                          ) : isLastGoal ? (
                            <>
                              <Award className="w-4 h-4 text-amber-600" />
                              <span className="text-[8px] font-extrabold mt-0.5">{t.freeStayGoal}</span>
                            </>
                          ) : (
                            <span className="font-serif-kr text-xs font-bold text-stone-400">
                              {idx + 1}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <p className="text-[11px] text-stone-600 text-center bg-[#F9F8F5] py-2.5 px-3 rounded-xl font-medium">
                  {t.remainText(10 - (myCustomerData.stamps || 0))}
                </p>
              </div>

              {/* 최근 방문 기록 */}
              {myCustomerData.history && myCustomerData.history.length > 0 && (
                <div className="bg-white/70 px-4 py-3.5 rounded-2xl border border-stone-200/80 text-xs">
                  <p className="font-bold text-stone-600 mb-2 flex items-center gap-1.5 text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-emerald-800" />
                    {t.historyTitle}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {myCustomerData.history.slice(-6).map((d, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-[#F7F5F0] border border-stone-300 rounded-lg text-[10px] font-mono font-semibold text-stone-700"
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 하단 푸터 */}
        <div className="px-6 py-4 bg-[#EFECE4] border-t border-stone-300/60 text-center">
          <p className="text-[11px] text-stone-600 font-medium">
            {t.footerText}
          </p>
        </div>
      </div>
    </div>
  );
}