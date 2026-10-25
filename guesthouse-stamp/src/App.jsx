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
  Gift,
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
  Award
} from 'lucide-react';

// 2026.11.1 ~ 2027.4.30 기간 내 법정 공휴일 목록 (체크아웃 날짜 기준)
const DEFAULT_HOLIDAYS = [
  { date: '2026-12-25', name: '크리스마스' },
  { date: '2027-01-01', name: '신정' },
  { date: '2027-02-06', name: '설날 연휴' },
  { date: '2027-02-07', name: '설날' },
  { date: '2027-02-08', name: '설날 연휴' },
  { date: '2027-02-09', name: '대체공휴일(설날)' },
  { date: '2027-03-01', name: '삼일절' }
];

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

const formatDateStr = (dateObj) => {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// [아트워크] 삼호대숲 & 백로·떼까마귀 일러스트 SVG
const SamhoArtHeader = ({ isLight = false }) => (
  <svg
    viewBox="0 0 400 185"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-full h-full object-cover"
  >
    {/* 배경 그라데이션 */}
    <defs>
      <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={isLight ? "#16261E" : "#0F1713"} />
        <stop offset="65%" stopColor="#1E3529" />
        <stop offset="100%" stopColor="#274235" />
      </linearGradient>
      <linearGradient id="moonGlow" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#F7F5F0" stopOpacity="0.95" />
        <stop offset="100%" stopColor="#DCE5DC" stopOpacity="0.7" />
      </linearGradient>
    </defs>

    <rect width="400" height="185" fill="url(#skyGrad)" />

    {/* 보름달 (백로의 순백을 상징하는 달빛) */}
    <circle cx="315" cy="58" r="28" fill="url(#moonGlow)" />
    <circle cx="315" cy="58" r="38" fill="#F7F5F0" fillOpacity="0.08" />

    {/* 멀리 보이는 태화강 능선 */}
    <path
      d="M0 145 Q90 120 190 140 T400 130 L400 185 L0 185 Z"
      fill="#14241B"
      fillOpacity="0.7"
    />

    {/* 좌측 삼호대숲 대나무 실루엣 & 댓잎 */}
    <g stroke="#0B130E" strokeWidth="2.5" opacity="0.85">
      <line x1="22" y1="185" x2="28" y2="15" />
      <line x1="38" y1="185" x2="48" y2="30" />
      <line x1="55" y1="185" x2="52" y2="55" />
    </g>
    <g fill="#0B130E" opacity="0.85">
      <path d="M26 45 Q45 38 56 48 Q40 52 26 45 Z" />
      <path d="M27 75 Q10 68 4 78 Q16 82 27 75 Z" />
      <path d="M45 62 Q65 55 78 65 Q60 70 45 62 Z" />
      <path d="M42 95 Q62 90 72 100 Q55 103 42 95 Z" />
    </g>

    {/* 은은한 에메랄드 대숲 레이어 */}
    <g stroke="#345E47" strokeWidth="1.8" opacity="0.55">
      <line x1="72" y1="185" x2="78" y2="70" />
      <line x1="365" y1="185" x2="355" y2="65" />
      <line x1="382" y1="185" x2="376" y2="40" />
    </g>
    <g fill="#345E47" opacity="0.55">
      <path d="M76 90 Q95 82 105 92 Q88 96 76 90 Z" />
      <path d="M358 85 Q340 78 330 88 Q345 92 358 85 Z" />
      <path d="M378 60 Q360 52 348 62 Q365 66 378 60 Z" />
    </g>

    {/* 떼까마귀 군무 (먹색 블랙 실루엣 - 달빛 주변을 유영) */}
    <g fill="#0D110F">
      <path d="M235 42 C241 35, 249 35, 254 41 C259 35, 267 35, 273 42 C263 40, 254 45, 254 45 C254 45, 245 40, 235 42 Z" />
      <path d="M272 28 C276 23, 282 23, 286 27 C290 23, 296 23, 300 28 C293 27, 286 30, 286 30 C286 30, 279 27, 272 28 Z" />
      <path d="M302 52 C307 47, 313 47, 317 51 C321 47, 327 47, 332 52 C324 50, 317 54, 317 54 C317 54, 310 50, 302 52 Z" />
      <path d="M208 60 C212 56, 217 56, 220 59 C223 56, 228 56, 232 60 C226 59, 220 62, 220 62 C220 62, 214 59, 208 60 Z" />
    </g>

    {/* 백로 (순백의 날개 - 우아하게 비상하는 메인 포인트) */}
    <g fill="#FBFBF9">
      {/* 큰 백로 */}
      <path d="M125 68 C138 52, 154 52, 165 65 C176 52, 192 52, 205 68 C188 64, 172 68, 165 73 C158 68, 142 64, 125 68 Z" />
      {/* 작은 백로 */}
      <path d="M178 40 C186 31, 196 31, 203 38 C210 31, 220 31, 228 40 C217 38, 208 41, 203 44 C198 41, 189 38, 178 40 Z" opacity="0.9" />
    </g>

    {/* 태화강 잔잔한 물결 라인 */}
    <path d="M110 165 L290 165" stroke="#F7F5F0" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="6 6" />
    <path d="M150 173 L250 173" stroke="#F7F5F0" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="4 4" />
  </svg>
);

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const isAdminParam = urlParams.get('admin') === 'true';

  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [adminPinError, setAdminPinError] = useState(false);
  const [adminSubTab, setAdminSubTab] = useState('list'); // 'list' | 'poster'

  // 손님용 상태
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [myCustomerId, setMyCustomerId] = useState(() => localStorage.getItem('samho_guest_id') || null);
  const [myCustomerData, setMyCustomerData] = useState(null);
  const [message, setMessage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 사장님 관리자용 상태
  const [customersList, setCustomersList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [holidays, setHolidays] = useState(DEFAULT_HOLIDAYS);
  const [newHDate, setNewHDate] = useState('');
  const [newHName, setNewHName] = useState('');

  // 현재 실제 시간 기준 상태
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
    const checkInDayName = DAY_NAMES[checkInDayIdx];
    const checkOutDayName = DAY_NAMES[checkOutDateObj.getDay()];

    if (!isTimeAllowed) {
      return {
        canStamp: false,
        title: '객실 정비 및 준비 시간 (11:00 ~ 15:00)',
        reason: '스탬프 적립은 체크인(15:00)부터 다음 날 체크아웃(11:00) 사이에만 가능합니다.'
      };
    }

    // 1. 이벤트 시즌 검사 (11. 1. ~ 4. 30.)
    const checkInMonth = checkInDateObj.getMonth() + 1;
    if (!(checkInMonth >= 11 || checkInMonth <= 4)) {
      return {
        canStamp: false,
        title: '평일 스탬프 이벤트 비시즌',
        reason: '이 이벤트는 철새 도래기인 11월 1일부터 4월 30일까지 운영됩니다.'
      };
    }

    // 2. 체크아웃 날 공휴일 검사
    const matchedHoliday = holidays.find((h) => h.date === checkOutDateStr);
    if (matchedHoliday) {
      return {
        canStamp: false,
        title: `공휴일 전날 입실 제외 (${matchedHoliday.name})`,
        reason: `퇴실일(${checkOutDateStr})이 법정 공휴일이므로 이번 숙박은 평일 적립에서 제외됩니다.`
      };
    }

    // 3. 평일 입실 요일 검사 (일~목 입실 허용)
    if (![0, 1, 2, 3, 4].includes(checkInDayIdx)) {
      return {
        canStamp: false,
        title: '주말 숙박 적립 제외',
        reason: `${checkInDayName}요일 입실(퇴실 ${checkOutDayName}요일)은 주말 요금일로 적립 대상이 아닙니다.`
      };
    }

    return {
      canStamp: true,
      checkInDateStr,
      checkInDayName,
      checkOutDateStr,
      checkOutDayName,
      title: `오늘의 철새 스탬프 적립 가능`,
      reason: `${checkInDateStr}(${checkInDayName}) 입실 고객님, 성함과 연락처를 입력하시면 즉시 1회가 적립됩니다.`
    };
  }, [now, holidays]);

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
      setMessage({ type: 'error', text: '예약자 성함과 휴대폰 번호 11자리를 정확히 입력해주세요.' });
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
          text: `이번 숙박(${stayValidation.checkInDateStr} 입실) 스탬프는 이미 도장이 찍혔습니다. (1박 1회)`
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
          text: `축하합니다! 10번의 여정을 모두 채워 [평일 1박 무료 숙박권]이 발급되었습니다.`
        });
      } else {
        setMessage({
          type: 'success',
          text: `${stayValidation.checkInDateStr}(${stayValidation.checkInDayName} 입실) 삼호대숲 철새 도장이 찍혔습니다!`
        });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: '통신 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
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
    setHolidays([...holidays, { date: newHDate, name: newHName.trim() }].sort((a, b) => a.date.localeCompare(b.date)));
    setNewHDate('');
    setNewHName('');
  };

  // ==========================================================
  // [모드 A] 사장님 관리자 및 아트 포스터 인쇄 (?admin=true)
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
              <p className="text-[11px] tracking-widest uppercase text-emerald-400 font-bold">STAY SAMHO ADMIN</p>
              <h2 className="font-serif-kr text-xl font-bold text-white mt-1">철새마을 관리자 인증</h2>
              <p className="text-xs text-stone-400 mt-1">비밀번호 4자리를 입력해주세요 (기본: 0000)</p>
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
                관리자 페이지 열기
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
              <Feather className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="font-serif-kr text-xl font-bold text-stone-900">삼호철새마을 게스트하우스</h1>
              <p className="text-xs text-emerald-800 font-semibold">실시간 스탬프북 & 객실 아트 포스터 관리</p>
            </div>
          </div>
          <div className="flex bg-stone-200 p-1 rounded-2xl text-xs font-bold">
            <button
              onClick={() => setAdminSubTab('list')}
              className={`px-4 py-2.5 rounded-xl transition cursor-pointer ${
                adminSubTab === 'list' ? 'bg-[#141A17] text-white shadow-sm' : 'text-stone-600 hover:text-black'
              }`}
            >
              고객 적립 관리 ({customersList.length})
            </button>
            <button
              onClick={() => setAdminSubTab('poster')}
              className={`px-4 py-2.5 rounded-xl transition cursor-pointer ${
                adminSubTab === 'poster' ? 'bg-[#141A17] text-white shadow-sm' : 'text-stone-600 hover:text-black'
              }`}
            >
              객실 비치용 아트 포스터 인쇄
            </button>
          </div>
        </header>

        {adminSubTab === 'list' ? (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-stone-200/90 p-6 shadow-xs space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <div>
                  <h2 className="font-serif-kr font-bold text-stone-900 text-lg">숙박객 스탬프 현황</h2>
                  <p className="text-xs text-stone-500">손님이 객실 QR로 적립하면 즉시 이곳에 표시됩니다.</p>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="이름 또는 연락처 검색"
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
                            <span className="px-3 font-black text-emerald-900">{c.stamps || 0} / 10</span>
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
              <h3 className="font-serif-kr font-bold text-stone-900 text-base">체크아웃 공휴일 제외 설정</h3>
              <p className="text-xs text-stone-500">아래 날짜에 체크아웃하는 전날 입실객은 평일 적립에서 자동 제외됩니다.</p>
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
             객실 액자형 A4 아트 포스터 (인테리어 소품 스타일)
             ================================================= */
          <div className="space-y-5 text-center">
            <div className="print:hidden flex justify-center">
              <button
                onClick={() => window.print()}
                className="px-6 py-3 bg-[#141A17] hover:bg-emerald-950 text-[#F7F5F0] font-bold rounded-2xl text-sm shadow-lg cursor-pointer inline-flex items-center gap-2"
              >
                <Printer className="w-4 h-4 text-emerald-400" /> A4 액자용 포스터 인쇄하기
              </button>
            </div>

            {/* 실제 인쇄될 A4 프레임 */}
            <div className="max-w-[520px] mx-auto bg-[#F7F5F0] text-[#141A17] rounded-3xl overflow-hidden shadow-2xl border-2 border-[#141A17] print:shadow-none print:rounded-none">
              {/* 상단 갤러리 아트워크 영역 */}
              <div className="relative h-56 bg-[#121A16]">
                <SamhoArtHeader isLight={true} />
                <div className="absolute inset-0 flex flex-col justify-between p-7 text-left">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] tracking-[0.25em] uppercase font-bold text-emerald-300 bg-black/40 px-3 py-1 rounded-full border border-emerald-700/50">
                      TAEHWAGang Eco Stay
                    </span>
                    <span className="text-[11px] font-serif-kr text-stone-300">삼호대숲 철새마을</span>
                  </div>
                  <div>
                    <p className="text-xs text-emerald-200/90 font-medium">삼호철새마을 게스트하우스</p>
                    <h2 className="font-serif-kr text-3xl font-bold text-[#F7F5F0] tracking-tight mt-1">
                      철새 여정 스탬프북
                    </h2>
                  </div>
                </div>
              </div>

              {/* 포스터 본문 */}
              <div className="p-8 space-y-6">
                <div className="space-y-1.5">
                  <span className="text-xs font-extrabold tracking-widest text-emerald-900 uppercase">
                    WEEKDAY STAY REWARD EVENT
                  </span>
                  <h3 className="font-serif-kr text-xl font-bold text-[#141A17] leading-snug">
                    평일 열 번의 쉼표가 모이면,<br />
                    <span className="text-emerald-800 underline decoration-emerald-700/50 underline-offset-4">
                      평일 1박 무료 숙박권
                    </span>
                    을 선물합니다
                  </h3>
                </div>

                {/* 중앙 QR 스캔 티켓 박스 */}
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
                    스마트폰 카메라로 스캔해주세요
                  </p>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    별도 앱 설치 없이 성함과 연락처만으로 즉시 적립됩니다
                  </p>
                </div>

                {/* 3단계 이용 방법 */}
                <div className="grid grid-cols-3 gap-2.5 text-center pt-1">
                  <div className="bg-white/80 p-3 rounded-2xl border border-stone-200/80">
                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      STEP 01
                    </span>
                    <p className="font-bold text-xs mt-1.5 text-stone-900">객실 QR 스캔</p>
                    <p className="text-[10px] text-stone-500 mt-0.5">기본 카메라로 스캔</p>
                  </div>
                  <div className="bg-white/80 p-3 rounded-2xl border border-stone-200/80">
                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      STEP 02
                    </span>
                    <p className="font-bold text-xs mt-1.5 text-stone-900">예약자 정보 입력</p>
                    <p className="text-[10px] text-stone-500 mt-0.5">이름 · 연락처 입력</p>
                  </div>
                  <div className="bg-white/80 p-3 rounded-2xl border border-stone-200/80">
                    <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      STEP 03
                    </span>
                    <p className="font-bold text-xs mt-1.5 text-stone-900">10회 달성 혜택</p>
                    <p className="text-[10px] text-stone-500 mt-0.5">무료 숙박권 자동 발급</p>
                  </div>
                </div>

                {/* 하단 규정 안내 */}
                <div className="text-left text-[11px] text-stone-600 bg-[#EFECE4] p-4 rounded-2xl space-y-1 border border-stone-300/70">
                  <p className="font-bold text-stone-900 text-xs mb-1">스탬프 적립 규정 안내</p>
                  <p>• <strong>운영 기간:</strong> 매년 11월 1일 ~ 익년 4월 30일 (동절기 철새 도래 시즌)</p>
                  <p>• <strong>적립 시간:</strong> 입실일 체크인(15:00)부터 익일 체크아웃(11:00) 사이에만 활성화</p>
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
  // [모드 B] 손님용 스탬프 패스포트 (객실 QR 스캔 시 메인 화면)
  // ==========================================================
  return (
    <div className="min-h-screen bg-[#0E1310] text-[#181C1A] flex flex-col justify-center items-center p-4 py-8 selection:bg-emerald-900 selection:text-white">
      {/* 메인 스테이 패스포트 카드 */}
      <div className="w-full max-w-[420px] bg-[#F7F5F0] rounded-[32px] shadow-2xl overflow-hidden border border-stone-700/40">
        {/* 1. 상단 삼호대숲 & 백로·떼까마귀 일러스트 배너 */}
        <div className="relative h-48 bg-[#121A16]">
          <SamhoArtHeader />

          {/* 상단 배지 */}
          <div className="absolute top-4 left-5 right-5 flex justify-between items-center">
            <span className="inline-flex items-center gap-1.5 text-[10px] tracking-widest uppercase font-bold bg-black/45 text-emerald-300 px-3 py-1 rounded-full border border-emerald-700/40 backdrop-blur-xs">
              <Feather className="w-3 h-3" /> SAMHO BIRD VILLAGE
            </span>
            <span className="text-[11px] font-mono text-stone-300 bg-black/40 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
              15:00 - 11:00
            </span>
          </div>

          {/* 하단 타이틀 오버레이 */}
          <div className="absolute bottom-4 left-6 right-6 text-white">
            <p className="text-xs text-emerald-200/90 font-medium tracking-wide">
              삼호철새마을 게스트하우스
            </p>
            <h1 className="font-serif-kr text-2xl font-bold tracking-tight text-[#F7F5F0] mt-0.5">
              대숲에 머무는 열 번의 쉼표
            </h1>
          </div>
        </div>

        {/* 2. 본문 한지(Paper) 영역 */}
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
                    여행자 패스포트 열기
                  </h2>
                  <p className="text-[11px] text-stone-500 mt-0.5">
                    예약하신 성함과 연락처를 입력하시면 자동으로 도장이 찍힙니다.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    예약자 성함
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      placeholder="성함을 입력해주세요"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-[#F9F8F5] border border-stone-300 rounded-2xl text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-[#162920] focus:bg-white transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1.5">
                    휴대폰 번호
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      placeholder="010-1234-5678"
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
                  '패스포트 확인 중...'
                ) : stayValidation.canStamp ? (
                  <>
                    <Feather className="w-4 h-4 text-emerald-400" />
                    오늘의 철새 스탬프 찍기
                  </>
                ) : (
                  '내 스탬프 패스포트 조회하기'
                )}
              </button>
            </form>
          ) : (
            /* [화면 분기 2] 로그인 후: 낙관(도장) 스타일 스탬프 패스포트 */
            <div className="space-y-5">
              {/* 여행자 프로필 바 */}
              <div className="flex justify-between items-center bg-white px-4 py-3.5 rounded-2xl border border-stone-200/80 shadow-2xs">
                <div>
                  <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-800">
                    SAMHO TRAVELER
                  </span>
                  <h3 className="font-serif-kr font-bold text-stone-900 text-base">
                    {myCustomerData.name}님의 스탬프북
                  </h3>
                </div>
                <button
                  onClick={() => {
                    setMyCustomerId(null);
                    setMyCustomerData(null);
                    localStorage.removeItem('samho_guest_id');
                  }}
                  className="text-xs text-stone-500 hover:text-stone-900 flex items-center gap-1 cursor-pointer bg-stone-100 px-2.5 py-1.5 rounded-xl"
                >
                  <LogOut className="w-3.5 h-3.5" /> 다른 번호
                </button>
              </div>

              {/* 보유 무료 숙박권 바우처 (티켓 펀칭 디자인) */}
              {myCustomerData.coupons > 0 && (
                <div className="relative bg-[#141E19] text-[#F7F5F0] rounded-3xl p-5 shadow-xl overflow-hidden border border-emerald-800/50">
                  <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#F7F5F0]"></div>
                  <div className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#F7F5F0]"></div>

                  <div className="pl-2 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold tracking-widest uppercase bg-emerald-400/20 text-emerald-300 px-2.5 py-0.5 rounded-full">
                        FREE STAY VOUCHER ({myCustomerData.coupons}매)
                      </span>
                      <span className="text-[11px] font-mono text-amber-300">
                        {myCustomerData.couponCode}
                      </span>
                    </div>
                    <h4 className="font-serif-kr text-lg font-bold text-white pt-1">
                      삼호철새마을 평일 1박 무료 숙박권
                    </h4>
                    <p className="text-[11px] text-stone-300">
                      평일 예약 시 관리자에게 본 바우처 화면을 제시해주세요.
                    </p>
                  </div>
                </div>
              )}

              {/* 10칸 원형 낙관(도장) 스탬프 보드 */}
              <div className="bg-white p-5 rounded-3xl border border-stone-200/90 shadow-xs space-y-4">
                <div className="flex justify-between items-end border-b border-stone-100 pb-3">
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                      STAMP PASSPORT
                    </span>
                    <h4 className="font-serif-kr font-bold text-sm text-stone-900">
                      삼호대숲 열 번의 발자취
                    </h4>
                  </div>
                  <span className="font-serif-kr font-black text-base text-emerald-900">
                    {myCustomerData.stamps || 0} <span className="text-xs font-normal text-stone-400">/ 10회</span>
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
                              ? 'bg-amber-50/70 border-2 border-dashed border-amber-400 text-amber-700'
                              : 'bg-[#F9F8F5] border border-dashed border-stone-300 text-stone-400'
                          }`}
                        >
                          {isStamped ? (
                            <>
                              <Feather className="w-4 h-4 text-emerald-300" />
                              <span className="text-[8px] font-mono font-bold tracking-tighter text-stone-200 mt-0.5">
                                {stampedDate ? stampedDate.slice(5).replace('-', '.') : 'STAY'}
                              </span>
                            </>
                          ) : isLastGoal ? (
                            <>
                              <Award className="w-4 h-4 text-amber-600" />
                              <span className="text-[8px] font-extrabold mt-0.5">무료숙박</span>
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

                <p className="text-[11px] text-stone-500 text-center bg-[#F9F8F5] py-2 rounded-xl">
                  {10 - (myCustomerData.stamps || 0)}번 더 머무르시면 <strong>평일 1박 무료 숙박권</strong>이 발급됩니다.
                </p>
              </div>

              {/* 최근 방문 기록 */}
              {myCustomerData.history && myCustomerData.history.length > 0 && (
                <div className="bg-white/70 px-4 py-3.5 rounded-2xl border border-stone-200/80 text-xs">
                  <p className="font-bold text-stone-600 mb-2 flex items-center gap-1.5 text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-emerald-800" />
                    최근 머문 입실일 기록
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
          <p className="text-[10px] text-stone-500 font-medium">
            삼호철새마을 게스트하우스 · 11. 1. ~ 4. 30. 평일 숙박 이벤트
          </p>
        </div>
      </div>
    </div>
  );
}