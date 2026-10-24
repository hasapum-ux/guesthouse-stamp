import React, { useState, useEffect, useMemo } from 'react';
import {
  Stamp,
  ShieldCheck,
  QrCode,
  Calendar,
  Gift,
  Search,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Settings,
  Printer,
  Phone,
  User,
  Trash2,
  Sparkles,
  Clock,
  Smartphone,
  LogOut,
  ArrowRight
} from 'lucide-react';

// 2026.11.1 ~ 2027.4.30 기간 내 법정 공휴일 목록 (달력상 공휴일 날짜 그대로 등록)
const DEFAULT_HOLIDAYS = [
  { date: '2026-12-25', name: '크리스마스' },
  { date: '2027-01-01', name: '신정' },
  { date: '2027-02-06', name: '설날 연휴' },
  { date: '2027-02-07', name: '설날' },
  { date: '2027-02-08', name: '설날 연휴' },
  { date: '2027-02-09', name: '대체공휴일(설날)' },
  { date: '2027-03-01', name: '삼일절' }
];

// 초기 샘플 고객 데이터
const INITIAL_CUSTOMERS = [
  {
    id: 'c1',
    name: '김여행',
    phone: '010-1234-5678',
    stamps: 9,
    coupons: 0,
    usedCoupons: 0,
    lastStampedDate: '2026-11-02',
    history: [
      '2025-11-12', '2025-11-26', '2025-12-10', '2026-01-14',
      '2026-02-04', '2026-03-11', '2026-03-25', '2026-04-15', '2026-11-02'
    ]
  },
  {
    id: 'c2',
    name: '이바다',
    phone: '010-9876-5432',
    stamps: 3,
    coupons: 1,
    usedCoupons: 0,
    lastStampedDate: '2026-11-03',
    history: ['2026-03-10', '2026-04-08', '2026-11-03']
  }
];

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

// 날짜 문자열(YYYY-MM-DD)에서 원하는 일수(+1일, -1일 등)를 계산하는 함수
const addDaysToDateStr = (dateStr, daysToAdd) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d + daysToAdd);
  const ny = dateObj.getFullYear();
  const nm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const nd = String(dateObj.getDate()).padStart(2, '0');
  return `${ny}-${nm}-${nd}`;
};

// 날짜 문자열의 요일 인덱스(0~6)와 한글 요일명을 반환하는 함수
const getDayInfo = (dateStr) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dayIndex = new Date(y, m - 1, d).getDay();
  return { dayIndex, dayName: DAY_NAMES[dayIndex] };
};

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const qrParam = urlParams.get('qr');
  const isGuestOnlyUrl = urlParams.get('mode') === 'guest' || Boolean(qrParam);

  const [activeTab, setActiveTab] = useState('guest');

  // 기본 시뮬레이션 입실 날짜: 2026-11-03(화)
  const [simulatedDate, setSimulatedDate] = useState('2026-11-03');

  // 설정 상태 (v3 키로 저장해 새 기본값 즉시 반영)
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('gh_settings_v3');
    return saved
      ? JSON.parse(saved)
      : {
          guesthouseName: '게스트하우스 평일 스탬프북',
          qrSecretKey: 'room_stamp_2026',
          allowedDays: [0, 1, 2, 3, 4], // 숙박업 평일 기준: 일~목 입실 (금, 토 입실 제외)
          targetStamps: 10,
          posterNotice: '11월~4월 평일(공휴일 전날 제외) 10회 숙박 시 평일 1박 무료 숙박권을 드립니다!',
          baseSiteUrl: window.location.origin
        };
  });

  // QR 스캔 접속 여부
  const [simulateQrScan, setSimulateQrScan] = useState(true);
  const isQrVerified = qrParam === settings.qrSecretKey || simulateQrScan;

  // 고객 및 공휴일 데이터
  const [customers, setCustomers] = useState(() => {
    const saved = localStorage.getItem('gh_customers_v3');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [holidays, setHolidays] = useState(() => {
    const saved = localStorage.getItem('gh_holidays_v3');
    return saved ? JSON.parse(saved) : DEFAULT_HOLIDAYS;
  });

  // 손님 로그인 상태
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [loggedInCustomerId, setLoggedInCustomerId] = useState(() => {
    return localStorage.getItem('gh_my_customer_id') || null;
  });
  const [guestMessage, setGuestMessage] = useState(null);

  // 관리자 화면 검색 및 공휴일 추가 상태
  const [searchQuery, setSearchQuery] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');

  // 로컬스토리지 자동 동기화
  useEffect(() => {
    localStorage.setItem('gh_customers_v3', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem('gh_settings_v3', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('gh_holidays_v3', JSON.stringify(holidays));
  }, [holidays]);

  useEffect(() => {
    if (loggedInCustomerId) {
      localStorage.setItem('gh_my_customer_id', loggedInCustomerId);
    } else {
      localStorage.removeItem('gh_my_customer_id');
    }
  }, [loggedInCustomerId]);

  // 전화번호 하이픈 자동 포맷팅
  const formatPhone = (val) => {
    const nums = val.replace(/[^\d]/g, '').slice(0, 11);
    if (nums.length <= 3) return nums;
    if (nums.length <= 7) return `${nums.slice(0, 3)}-${nums.slice(3)}`;
    return `${nums.slice(0, 3)}-${nums.slice(3, 7)}-${nums.slice(7)}`;
  };

  // [핵심] 입실일(simulatedDate) 및 체크아웃 날(simulatedDate + 1일) 기준 적립 가능 여부 판별
  const dateStatus = useMemo(() => {
    const [, m, d] = simulatedDate.split('-').map(Number);
    const { dayIndex: checkInDayIdx, dayName: checkInDayName } = getDayInfo(simulatedDate);

    // 체크아웃 날짜 = 입실일 + 1일
    const checkOutDate = addDaysToDateStr(simulatedDate, 1);
    const { dayName: checkOutDayName } = getDayInfo(checkOutDate);

    // 1. 이벤트 기간 확인 (입실일 기준 11월 ~ 4월만 허용)
    const isValidSeason = m >= 11 || m <= 4;
    if (!isValidSeason) {
      return {
        canStamp: false,
        checkInDayName,
        checkOutDate,
        checkOutDayName,
        badgeText: '이벤트 기간 외',
        reason: `입실일(${m}월 ${d}일)은 이벤트 운영 기간(11월 1일 ~ 4월 30일)이 아닙니다.`
      };
    }

    // 2. 공휴일 확인 (체크아웃하는 날이 공휴일이면 전날 입실은 적립 제외!)
    const matchedCheckoutHoliday = holidays.find((h) => h.date === checkOutDate);
    if (matchedCheckoutHoliday) {
      return {
        canStamp: false,
        checkInDayName,
        checkOutDate,
        checkOutDayName,
        badgeText: `적립제외 (체크아웃 공휴일: ${matchedCheckoutHoliday.name})`,
        reason: `체크아웃 날(${checkOutDate}, ${matchedCheckoutHoliday.name})이 공휴일이므로 ${simulatedDate}(${checkInDayName}) 입실은 평일 적립에서 제외됩니다.`
      };
    }

    // 3. 평일 입실 요일 확인 (기본: 일~목 입실만 허용, 금·토 입실 제외)
    if (!settings.allowedDays.includes(checkInDayIdx)) {
      return {
        canStamp: false,
        checkInDayName,
        checkOutDate,
        checkOutDayName,
        badgeText: '주말 입실 제외',
        reason: `${checkInDayName}요일 입실(체크아웃 ${checkOutDayName}요일)은 주말 숙박으로 평일 적립 대상에서 제외됩니다.`
      };
    }

    return {
      canStamp: true,
      checkInDayName,
      checkOutDate,
      checkOutDayName,
      badgeText: '평일 자동적립 가능',
      reason: `적립 가능한 평일 입실(${checkInDayName}요일 입실 → ${checkOutDate} ${checkOutDayName}요일 체크아웃)입니다.`
    };
  }, [simulatedDate, holidays, settings.allowedDays]);

  // 현재 로그인한 손님 객체
  const currentCustomer = useMemo(() => {
    return customers.find((c) => c.id === loggedInCustomerId) || null;
  }, [customers, loggedInCustomerId]);

  // 조건 충족 시 자동 스탬프 적립 실행
  const tryAutoStamp = (targetCustomer) => {
    if (!targetCustomer) return;

    if (!isQrVerified) {
      setGuestMessage({
        type: 'info',
        text: '일반 링크로 접속하셨습니다. 객실 내 QR코드를 스캔해 접속하면 스탬프가 자동 적립됩니다.'
      });
      return;
    }

    if (!dateStatus.canStamp) {
      setGuestMessage({
        type: 'error',
        text: `자동 적립 불가: ${dateStatus.reason}`
      });
      return;
    }

    if (targetCustomer.lastStampedDate === simulatedDate) {
      setGuestMessage({
        type: 'info',
        text: `오늘 입실(${simulatedDate}) 스탬프는 이미 자동 적립이 완료되었습니다. (1일 1회)`
      });
      return;
    }

    // 스탬프 +1 적립 처리
    const nextStamps = targetCustomer.stamps + 1;
    const earnedCoupon = nextStamps >= settings.targetStamps;

    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id !== targetCustomer.id) return c;
        return {
          ...c,
          stamps: earnedCoupon ? nextStamps - settings.targetStamps : nextStamps,
          coupons: earnedCoupon ? c.coupons + 1 : c.coupons,
          lastStampedDate: simulatedDate,
          history: [...c.history, simulatedDate]
        };
      })
    );

    if (earnedCoupon) {
      setGuestMessage({
        type: 'reward',
        text: '축하합니다! 10회 적립 달성으로 [평일 1박 무료 숙박권]이 자동 발급되었습니다!'
      });
    } else {
      setGuestMessage({
        type: 'success',
        text: `객실 QR 인증 완료! ${simulatedDate}(${dateStatus.checkInDayName}요일 입실) 스탬프가 자동 적립되었습니다.`
      });
    }
  };

  // 로그인 상태이거나 테스트 날짜 변경 시 자동 적립 시도
  useEffect(() => {
    if (currentCustomer && activeTab === 'guest') {
      tryAutoStamp(currentCustomer);
    }
  }, [loggedInCustomerId, simulatedDate, isQrVerified]);

  // 손님 이름 + 전화번호 입력 시
  const handleGuestLoginAndAutoStamp = (e) => {
    e.preventDefault();
    const cleanName = guestName.trim();
    const cleanPhone = guestPhone.trim();

    if (!cleanName || cleanPhone.length < 12) {
      setGuestMessage({
        type: 'error',
        text: '예약자 성함과 휴대폰 번호 11자리를 정확히 입력해주세요.'
      });
      return;
    }

    let found = customers.find((c) => c.phone === cleanPhone);
    if (!found) {
      found = {
        id: 'c_' + Date.now(),
        name: cleanName,
        phone: cleanPhone,
        stamps: 0,
        coupons: 0,
        usedCoupons: 0,
        lastStampedDate: null,
        history: []
      };
      setCustomers((prev) => [found, ...prev]);
    }

    setLoggedInCustomerId(found.id);
  };

  // 관리자: 스탬프 수동 증감
  const adjustStamps = (customerId, delta) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id !== customerId) return c;
        let nextStamps = c.stamps + delta;
        let nextCoupons = c.coupons;

        if (nextStamps >= settings.targetStamps) {
          nextStamps -= settings.targetStamps;
          nextCoupons += 1;
        } else if (nextStamps < 0) {
          nextStamps = 0;
        }

        const updatedHistory =
          delta > 0
            ? [...c.history, `${simulatedDate}(관리자)`]
            : c.history.slice(0, -1);

        return {
          ...c,
          stamps: nextStamps,
          coupons: nextCoupons,
          history: updatedHistory
        };
      })
    );
  };

  // 관리자: 무료 숙박권 사용 처리
  const useCoupon = (customerId) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id !== customerId || c.coupons <= 0) return c;
        return {
          ...c,
          coupons: c.coupons - 1,
          usedCoupons: c.usedCoupons + 1
        };
      })
    );
  };

  // 관리자: 평일 요일 토글
  const toggleAllowedDay = (dayIdx) => {
    setSettings((prev) => {
      const exists = prev.allowedDays.includes(dayIdx);
      const nextDays = exists
        ? prev.allowedDays.filter((d) => d !== dayIdx)
        : [...prev.allowedDays, dayIdx].sort();
      return { ...prev, allowedDays: nextDays };
    });
  };

  // 관리자: 공휴일 추가
  const handleAddHoliday = (e) => {
    e.preventDefault();
    if (!newHolidayDate || !newHolidayName.trim()) return;
    if (holidays.some((h) => h.date === newHolidayDate)) return;
    setHolidays((prev) =>
      [...prev, { date: newHolidayDate, name: newHolidayName.trim() }].sort((a, b) =>
        a.date.localeCompare(b.date)
      )
    );
    setNewHolidayDate('');
    setNewHolidayName('');
  };

  const fullQrUrl = `${settings.baseSiteUrl.replace(/\/$/, '')}/?qr=${settings.qrSecretKey}`;

  const filteredCustomers = customers.filter(
    (c) => c.name.includes(searchQuery) || c.phone.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* 상단 네비게이션 및 테스트 시뮬레이터 (인쇄 시 숨김) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 print:hidden">
        <div className="max-w-5xl mx-auto px-4 py-3 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold">
                <Stamp className="w-5 h-5" />
              </div>
              <div>
                <h1 className="font-bold text-slate-900 leading-tight">{settings.guesthouseName}</h1>
                <p className="text-xs text-slate-500">
                  11.1.~4.30. 평일 입실 · 체크아웃 공휴일 기준 자동 판별
                </p>
              </div>
            </div>

            {!isGuestOnlyUrl && (
              <div className="flex bg-slate-100 p-1 rounded-xl text-sm font-medium">
                <button
                  onClick={() => setActiveTab('guest')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    activeTab === 'guest'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  손님용 화면
                </button>
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    activeTab === 'admin'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  사장님 관리자
                </button>
                <button
                  onClick={() => setActiveTab('poster')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    activeTab === 'poster'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  QR 포스터 인쇄
                </button>
              </div>
            )}
          </div>

          {/* 테스트용 컨트롤 바 */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-100 px-3 py-2 rounded-xl text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="font-semibold text-slate-700">입실일:</span>
              <input
                type="date"
                value={simulatedDate}
                onChange={(e) => setSimulatedDate(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2 py-1 font-semibold text-slate-800"
              />
              <span className="text-slate-500 font-medium flex items-center gap-1">
                ({dateStatus.checkInDayName}) <ArrowRight className="w-3 h-3" /> 체크아웃:{' '}
                <strong className="text-slate-800">
                  {dateStatus.checkOutDate}({dateStatus.checkOutDayName})
                </strong>
              </span>

              <span
                className={`px-2.5 py-0.5 rounded-full font-bold ${
                  dateStatus.canStamp
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-100 text-rose-700'
                }`}
              >
                {dateStatus.badgeText}
              </span>
            </div>

            {/* 빠른 시나리오 테스트 버튼 */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSimulatedDate('2026-11-03')}
                className="px-2 py-1 bg-white border border-slate-300 rounded-md hover:bg-indigo-50 text-slate-700 font-medium cursor-pointer"
              >
                11/3(화·평일)
              </button>
              <button
                type="button"
                onClick={() => setSimulatedDate('2026-12-24')}
                className="px-2 py-1 bg-rose-50 border border-rose-300 rounded-md hover:bg-rose-100 text-rose-700 font-bold cursor-pointer"
              >
                12/24(목·크리스마스 전날)
              </button>
              <button
                type="button"
                onClick={() => setSimulatedDate('2026-12-31')}
                className="px-2 py-1 bg-white border border-slate-300 rounded-md hover:bg-indigo-50 text-slate-700 font-medium cursor-pointer"
              >
                12/31(목·신정 전날)
              </button>
              <button
                type="button"
                onClick={() => setSimulatedDate('2026-11-06')}
                className="px-2 py-1 bg-white border border-slate-300 rounded-md hover:bg-indigo-50 text-slate-700 font-medium cursor-pointer"
              >
                11/6(금·주말)
              </button>

              <button
                type="button"
                onClick={() => setSimulateQrScan((prev) => !prev)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition cursor-pointer ml-1 ${
                  isQrVerified
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-300 text-slate-700'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                {isQrVerified ? 'QR접속 ON' : 'QR접속 OFF'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 1. 손님용 스탬프북 화면 */}
      {activeTab === 'guest' && (
        <main className="max-w-md mx-auto px-4 pt-6">
          <div className="bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden">
            {/* 상단 배너 */}
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 text-white p-6">
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-white/20 px-2.5 py-1 rounded-full">
                  <Sparkles className="w-3.5 h-3.5" /> 11. 1. ~ 4. 30. 평일 이벤트
                </span>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    isQrVerified
                      ? 'bg-emerald-400/30 text-emerald-100'
                      : 'bg-rose-400/30 text-rose-100'
                  }`}
                >
                  {isQrVerified ? '객실 QR 인증됨' : '조회 전용 모드'}
                </span>
              </div>
              <h2 className="text-xl font-bold leading-snug">{settings.posterNotice}</h2>
              <div className="mt-3 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-indigo-100">
                <span>입실일: {simulatedDate} ({dateStatus.checkInDayName})</span>
                <span>체크아웃: {dateStatus.checkOutDate} ({dateStatus.checkOutDayName})</span>
              </div>
            </div>

            <div className="p-6">
              {/* 현재 날짜 적립 가능 여부 배너 */}
              <div
                className={`mb-5 p-3.5 rounded-2xl text-xs font-medium flex items-start gap-2.5 ${
                  dateStatus.canStamp && isQrVerified
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50/70 text-rose-800 border border-rose-200'
                }`}
              >
                {dateStatus.canStamp && isQrVerified ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">{dateStatus.reason}</p>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    {isQrVerified
                      ? dateStatus.canStamp
                        ? '예약자 성함과 연락처를 입력하면 오늘 스탬프가 즉시 자동 적립됩니다.'
                        : '오늘은 적립 제외일이며, 기존 스탬프북 조회만 가능합니다.'
                      : '객실에 비치된 QR코드를 스캔해 접속하셔야 자동 적립됩니다.'}
                  </p>
                </div>
              </div>

              {/* 로그인 전: 이름 + 전화번호 입력 */}
              {!currentCustomer ? (
                <form onSubmit={handleGuestLoginAndAutoStamp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      예약자 성함
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        placeholder="홍길동"
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      휴대폰 번호
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="tel"
                        placeholder="010-1234-5678"
                        value={guestPhone}
                        onChange={(e) => setGuestPhone(formatPhone(e.target.value))}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {guestMessage && (
                    <div className="p-3 rounded-xl bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{guestMessage.text}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition cursor-pointer shadow-sm"
                  >
                    {isQrVerified && dateStatus.canStamp
                      ? '스탬프 자동 적립 & 내 스탬프북 열기'
                      : '내 스탬프북 조회하기'}
                  </button>

                  <p className="text-center text-xs text-slate-400">
                    샘플 조회: 김여행 (010-1234-5678)
                  </p>
                </form>
              ) : (
                /* 로그인 후: 스탬프북 화면 */
                <div className="space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <p className="text-xs text-slate-400">{currentCustomer.phone}</p>
                      <h3 className="text-lg font-bold text-slate-900">
                        {currentCustomer.name}님의 스탬프북
                      </h3>
                    </div>
                    <button
                      onClick={() => {
                        setLoggedInCustomerId(null);
                        setGuestMessage(null);
                      }}
                      className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" /> 다른 번호 입력
                    </button>
                  </div>

                  {/* 자동 적립 결과 메시지 */}
                  {guestMessage && (
                    <div
                      className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2.5 ${
                        guestMessage.type === 'error'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : guestMessage.type === 'reward'
                          ? 'bg-amber-100 text-amber-900 border-2 border-amber-400'
                          : guestMessage.type === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {guestMessage.type === 'error' ? (
                        <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
                      )}
                      <span className="leading-relaxed">{guestMessage.text}</span>
                    </div>
                  )}

                  {/* 보유 무료 숙박권 쿠폰 표시 */}
                  {currentCustomer.coupons > 0 && (
                    <div className="bg-amber-50 border-2 border-dashed border-amber-400 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-400 text-white flex items-center justify-center shrink-0">
                          <Gift className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-amber-800 bg-amber-200/70 px-2 py-0.5 rounded-full">
                            사용 가능 쿠폰 {currentCustomer.coupons}장
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm mt-0.5">
                            평일 1박 무료 숙박권
                          </h4>
                          <p className="text-xs text-slate-600">
                            다음 평일 예약 시 사장님께 이 화면을 제시해주세요.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 스탬프 10칸 그리드 */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-slate-500">현재 스탬프 달성 현황</span>
                      <span className="text-sm font-bold text-indigo-600">
                        {currentCustomer.stamps} / {settings.targetStamps}개
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      {Array.from({ length: settings.targetStamps }).map((_, idx) => {
                        const isStamped = idx < currentCustomer.stamps;
                        const stampedDate =
                          currentCustomer.history[
                            currentCustomer.history.length - currentCustomer.stamps + idx
                          ];
                        return (
                          <div
                            key={idx}
                            className={`aspect-square rounded-2xl flex flex-col items-center justify-center border transition ${
                              isStamped
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                : 'bg-white border-dashed border-slate-300 text-slate-300'
                            }`}
                          >
                            <Stamp className="w-5 h-5" />
                            <span className="text-[10px] font-bold mt-1">
                              {isStamped
                                ? stampedDate
                                  ? stampedDate.slice(5, 10)
                                  : '적립완료'
                                : `${idx + 1}`}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 최근 적립 일자 히스토리 */}
                  {currentCustomer.history.length > 0 && (
                    <div className="text-xs text-slate-500 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <p className="font-semibold text-slate-700 mb-1">최근 적립 입실일 기록</p>
                      <div className="flex flex-wrap gap-1.5">
                        {currentCustomer.history.slice(-5).map((d, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[11px]"
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
          </div>
        </main>
      )}

      {/* 2. 사장님 관리자 페이지 */}
      {activeTab === 'admin' && (
        <main className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
          {/* 요약 카드 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-400">등록된 스탬프북 고객</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{customers.length}명</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-400">미사용 무료 숙박권</span>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {customers.reduce((acc, c) => acc + c.coupons, 0)}장
              </p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-slate-200">
              <span className="text-xs font-semibold text-slate-400">공휴일 판별 방식</span>
              <p className="text-base font-bold text-indigo-600 mt-1">
                체크아웃 날(입실+1일)이 공휴일이면 제외
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 좌측 2열: 손님 스탬프 및 숙박권 관리 */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  손님별 적립 현황 관리
                </h2>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="이름 또는 번호 뒷자리 검색"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {filteredCustomers.map((c) => (
                  <div
                    key={c.id}
                    className="py-4 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{c.name}</span>
                        <span className="text-xs text-slate-500">{c.phone}</span>
                        {c.coupons > 0 && (
                          <span className="text-xs font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                            무료숙박권 {c.coupons}장 보유
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        최근 적립 입실일: {c.lastStampedDate || '내역 없음'} (누적 사용 쿠폰:{' '}
                        {c.usedCoupons}장)
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-slate-100 rounded-xl p-1">
                        <button
                          onClick={() => adjustStamps(c.id, -1)}
                          className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition cursor-pointer"
                          title="스탬프 1개 차감"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 text-sm font-bold text-indigo-600">
                          {c.stamps} / {settings.targetStamps}
                        </span>
                        <button
                          onClick={() => adjustStamps(c.id, 1)}
                          className="p-1.5 hover:bg-white rounded-lg text-slate-600 transition cursor-pointer"
                          title="스탬프 1개 수동 추가"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {c.coupons > 0 && (
                        <button
                          onClick={() => useCoupon(c.id)}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
                        >
                          숙박권 사용처리
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 우측 1열: 평일 요일 & 공휴일(체크아웃 기준) 설정 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-6">
              <h2 className="font-bold text-slate-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                운영 규칙 설정
              </h2>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600">
                  게스트하우스 이름
                </label>
                <input
                  type="text"
                  value={settings.guesthouseName}
                  onChange={(e) =>
                    setSettings({ ...settings, guesthouseName: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              {/* 평일 인정 입실 요일 선택 */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-600">
                  평일 적립 허용 입실 요일 (기본: 일~목 입실)
                </label>
                <div className="grid grid-cols-7 gap-1">
                  {DAY_NAMES.map((day, idx) => {
                    const active = settings.allowedDays.includes(idx);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleAllowedDay(idx)}
                        className={`py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                          active
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-slate-400">
                  일~목 입실(월~금 체크아웃)이 기본 선택되어 있습니다.
                </p>
              </div>

              {/* 공휴일 관리 (체크아웃 날짜 기준) */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    법정 공휴일 등록 (달력상 공휴일 날짜 입력)
                  </label>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    공휴일 날짜(예: 12/25)를 등록하면, <strong>그날 체크아웃하는 전날(12/24 입실)</strong>이 자동으로 적립 제외됩니다.
                  </p>
                </div>

                <form onSubmit={handleAddHoliday} className="space-y-2">
                  <input
                    type="date"
                    value={newHolidayDate}
                    onChange={(e) => setNewHolidayDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="예: 크리스마스, 대체공휴일"
                      value={newHolidayName}
                      onChange={(e) => setNewHolidayName(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-slate-800 text-white rounded-xl text-xs font-semibold cursor-pointer"
                    >
                      추가
                    </button>
                  </div>
                </form>

                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-xl px-3">
                  {holidays.map((h) => {
                    const blockedCheckInDate = addDaysToDateStr(h.date, -1);
                    return (
                      <div
                        key={h.date}
                        className="py-2.5 flex items-center justify-between text-xs gap-2"
                      >
                        <div>
                          <div className="font-semibold text-slate-800">
                            {h.date} ({h.name})
                          </div>
                          <div className="text-[11px] text-rose-600 font-medium">
                            → 적립 제외 입실일: {blockedCheckInDate}
                          </div>
                        </div>
                        <button
                          onClick={() =>
                            setHolidays(holidays.filter((item) => item.date !== h.date))
                          }
                          className="text-slate-400 hover:text-rose-600 cursor-pointer p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* 3. 객실 비치용 QR 포스터 제작 및 인쇄 */}
      {activeTab === 'poster' && (
        <main className="max-w-3xl mx-auto px-4 pt-6 space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 flex flex-wrap items-center justify-between gap-4 print:hidden">
            <div className="space-y-1 flex-1 min-w-[240px]">
              <label className="block text-xs font-semibold text-slate-600">
                배포된 웹앱 기본 도메인 주소
              </label>
              <input
                type="text"
                value={settings.baseSiteUrl}
                onChange={(e) => setSettings({ ...settings, baseSiteUrl: e.target.value })}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-xl text-xs"
              />
              <p className="text-[11px] text-indigo-600 font-mono">
                실제 QR 연결 주소: {fullQrUrl}
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-sm flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> A4 포스터 인쇄하기
            </button>
          </div>

          {/* 실제 인쇄되는 포스터 영역 */}
          <div className="bg-white rounded-3xl border-2 border-slate-200 p-10 text-center max-w-lg mx-auto shadow-sm print:shadow-none print:border-2 print:border-slate-800">
            <span className="inline-block px-4 py-1 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs mb-3">
              11. 1. ~ 4. 30. 평일 숙박 이벤트
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900">
              {settings.guesthouseName}
            </h2>
            <p className="text-indigo-600 font-bold text-base mt-2">
              {settings.posterNotice}
            </p>

            <div className="my-8 p-6 bg-slate-50 rounded-3xl inline-block border border-slate-200">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
                  fullQrUrl
                )}`}
                alt="스탬프 자동 적립 QR코드"
                className="w-52 h-52 mx-auto rounded-xl"
              />
              <p className="text-xs font-bold text-indigo-600 mt-3 flex items-center justify-center gap-1">
                <QrCode className="w-4 h-4" /> 카메라로 스캔하면 스탬프가 자동 적립됩니다
              </p>
            </div>

            <div className="text-left text-xs text-slate-600 space-y-2 bg-slate-50 p-5 rounded-2xl border border-slate-100">
              <p className="font-bold text-slate-800 text-sm mb-1">이용 및 적립 안내</p>
              <p>1. 스마트폰 카메라로 위 QR코드를 스캔해 웹페이지에 접속합니다.</p>
              <p>2. 예약자 성함과 연락처를 입력하면 즉시 스탬프 1회가 적립됩니다.</p>
              <p>3. 이벤트 기간(11. 1. ~ 4. 30.) 내 평일 입실 시에만 적립됩니다.</p>
              <p>4. 주말(금·토) 및 공휴일 전날(체크아웃 날이 공휴일인 경우) 입실은 적립 대상에서 제외됩니다.</p>
              <p>5. 스탬프 10회 달성 시 평일 1박 무료 숙박권 쿠폰이 자동 발급됩니다.</p>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}