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
  Trees,
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
  Compass
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

  // [시간 및 요일 판별 로직]
  // 입실(15:00) ~ 익일 퇴실(11:00) 허용 / 11:00~15:00 정비시간 차단
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
      // 15:00 ~ 23:59 : 당일 체크인 손님
      isTimeAllowed = true;
      checkOutDateObj.setDate(checkOutDateObj.getDate() + 1);
    } else if (totalMinutes <= CHECKOUT_TIME) {
      // 00:00 ~ 11:00 : 어제 입실하여 오늘 퇴실하는 손님 (어제 날짜로 숙박 산정)
      isTimeAllowed = true;
      checkInDateObj.setDate(checkInDateObj.getDate() - 1);
    } else {
      // 11:00 ~ 15:00 : 객실 정비 시간 (적립 차단)
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
        reason: '현재 시간은 객실 정비 시간(11:00 ~ 15:00)입니다. 체크인(15:00) 이후에 적립해주세요.'
      };
    }

    // 1. 이벤트 시즌 검사 (11월 ~ 4월)
    const checkInMonth = checkInDateObj.getMonth() + 1;
    if (!(checkInMonth >= 11 || checkInMonth <= 4)) {
      return {
        canStamp: false,
        reason: '현재 날짜는 평일 스탬프 이벤트 운영 기간(11. 1. ~ 4. 30.)이 아닙니다.'
      };
    }

    // 2. 체크아웃 날 공휴일 검사
    const matchedHoliday = holidays.find((h) => h.date === checkOutDateStr);
    if (matchedHoliday) {
      return {
        canStamp: false,
        reason: `퇴실일(${checkOutDateStr}, ${matchedHoliday.name})이 법정 공휴일이므로 이번 숙박은 평일 적립 대상에서 제외됩니다.`
      };
    }

    // 3. 평일 입실 요일 검사 (일~목 입실 허용: 0, 1, 2, 3, 4)
    if (![0, 1, 2, 3, 4].includes(checkInDayIdx)) {
      return {
        canStamp: false,
        reason: `${checkInDayName}요일 입실(퇴실 ${checkOutDayName}요일)은 주말 숙박으로 적립 대상에서 제외됩니다.`
      };
    }

    return {
      canStamp: true,
      checkInDateStr,
      checkInDayName,
      checkOutDateStr,
      checkOutDayName,
      reason: `적립 가능한 평일 숙박입니다 (${checkInDateStr} ${checkInDayName}요일 입실)`
    };
  }, [now, holidays]);

  // Firestore 실시간 데이터 구독 (손님 본인 데이터)
  useEffect(() => {
    if (!myCustomerId) return;
    const unsub = onSnapshot(doc(db, 'customers', myCustomerId), (docSnap) => {
      if (docSnap.exists()) {
        setMyCustomerData(docSnap.data());
      }
    });
    return () => unsub();
  }, [myCustomerId]);

  // 사장님 모드: 전체 고객 목록 실시간 동기화
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

  // 손님 스탬프 적립 핸들러
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

      // 조건 미충족 시 스탬프북 열람만 처리
      if (!stayValidation.canStamp) {
        setMyCustomerId(docId);
        setMyCustomerData(userData);
        localStorage.setItem('samho_guest_id', docId);
        setMessage({ type: 'info', text: stayValidation.reason });
        setIsSubmitting(false);
        return;
      }

      // 이미 당일 숙박 적립 완료 여부 체크
      if (userData.lastStampedDate === stayValidation.checkInDateStr) {
        setMyCustomerId(docId);
        setMyCustomerData(userData);
        localStorage.setItem('samho_guest_id', docId);
        setMessage({
          type: 'info',
          text: `이번 숙박(입실일: ${stayValidation.checkInDateStr}) 스탬프는 이미 적립되었습니다. (1박 1회)`
        });
        setIsSubmitting(false);
        return;
      }

      // 10회 적립 시 무료 숙박권 쿠폰 발급
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
          text: `축하합니다! 10회 숙박 달성으로 [평일 1박 무료 숙박권](${newCouponCode})이 발급되었습니다!`
        });
      } else {
        setMessage({
          type: 'success',
          text: `${stayValidation.checkInDateStr}(${stayValidation.checkInDayName}요일 입실) 철새 스탬프 1개가 정상 적립되었습니다!`
        });
      }
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: '데이터베이스 연결 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' });
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

  // ==========================================
  // [모드 A] 사장님 관리자 모드 (?admin=true)
  // ==========================================
  if (isAdminParam) {
    if (!isAdminUnlocked) {
      return (
        <div className="min-h-screen bg-stone-100 flex items-center justify-center p-4 font-sans">
          <div className="max-w-sm w-full bg-white p-8 rounded-3xl border border-stone-200 shadow-md text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-stone-900">철새마을 관리자 로그인</h2>
            <p className="text-xs text-stone-500">관리자 비밀번호를 입력하세요 (기본값: 0000)</p>
            <form onSubmit={handleAdminLogin} className="space-y-3">
              <input
                type="password"
                maxLength={4}
                value={adminPin}
                onChange={(e) => setAdminPin(e.target.value)}
                placeholder="PIN 4자리"
                className="w-full text-center text-xl font-bold py-2 border rounded-xl focus:outline-none focus:border-emerald-700 font-mono"
              />
              {adminPinError && <p className="text-xs text-rose-600 font-semibold">비밀번호가 올바르지 않습니다.</p>}
              <button type="submit" className="w-full py-2.5 bg-emerald-800 text-white font-bold rounded-xl text-sm cursor-pointer hover:bg-emerald-900">
                관리자 페이지 입장
              </button>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-stone-50 p-6 max-w-5xl mx-auto space-y-6 font-sans">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b pb-4 print:hidden">
          <div>
            <h1 className="text-xl font-black text-stone-900">삼호철새마을 게스트하우스 관리자</h1>
            <p className="text-xs text-emerald-800 font-medium">Firebase Firestore 실시간 클라우드 연동 중</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setAdminSubTab('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${adminSubTab === 'list' ? 'bg-emerald-800 text-white' : 'bg-white border text-stone-700'}`}
            >
              고객 스탬프 관리
            </button>
            <button
              onClick={() => setAdminSubTab('poster')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${adminSubTab === 'poster' ? 'bg-emerald-800 text-white' : 'bg-white border text-stone-700'}`}
            >
              객실 QR 포스터 인쇄
            </button>
          </div>
        </header>

        {adminSubTab === 'list' ? (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border p-5 space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-2">
                <h2 className="font-bold text-stone-800">등록된 손님 명단 ({customersList.length}명)</h2>
                <div className="relative">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="이름 또는 전화번호 뒷자리"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="border rounded-xl pl-9 pr-3 py-1.5 text-xs w-60 focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>
              <div className="divide-y text-xs">
                {customersList.length === 0 ? (
                  <p className="py-6 text-center text-stone-400">아직 적립한 손님이 없습니다.</p>
                ) : (
                  customersList
                    .filter((c) => (c.name || '').includes(searchQuery) || (c.phone || '').includes(searchQuery))
                    .map((c) => (
                      <div key={c.id} className="py-3 flex flex-wrap justify-between items-center gap-3">
                        <div>
                          <span className="font-bold text-stone-900 text-sm">{c.name}</span>
                          <span className="text-stone-500 ml-2 font-mono">{c.phone}</span>
                          {c.coupons > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-900 font-bold rounded-full">
                              무료숙박권 {c.coupons}장 ({c.couponCode})
                            </span>
                          )}
                          <p className="text-stone-400 text-[11px] mt-0.5">
                            최근 입실일: {c.lastStampedDate || '없음'} · 누적 사용: {c.usedCoupons || 0}장
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-stone-100 rounded-lg p-1">
                            <button onClick={() => adjustStampsAdmin(c.id, c.stamps, -1)} className="p-1 hover:bg-white rounded cursor-pointer">
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-3 font-bold text-emerald-800">{c.stamps} / 10</span>
                            <button onClick={() => adjustStampsAdmin(c.id, c.stamps, 1)} className="p-1 hover:bg-white rounded cursor-pointer">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {c.coupons > 0 && (
                            <button
                              onClick={() => useCouponAdmin(c.id, c.coupons, c.usedCoupons)}
                              className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg cursor-pointer"
                            >
                              숙박권 사용처리
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* 공휴일 제외일 관리 */}
            <div className="bg-white rounded-2xl border p-5 space-y-3">
              <h3 className="font-bold text-stone-800 text-sm">체크아웃 공휴일 관리 (전날 입실 자동 차단)</h3>
              <form onSubmit={handleAddHoliday} className="flex gap-2 text-xs">
                <input
                  type="date"
                  value={newHDate}
                  onChange={(e) => setNewHDate(e.target.value)}
                  className="border rounded-xl px-3 py-1.5"
                />
                <input
                  type="text"
                  placeholder="공휴일 이름"
                  value={newHName}
                  onChange={(e) => setNewHName(e.target.value)}
                  className="border rounded-xl px-3 py-1.5 flex-1"
                />
                <button type="submit" className="px-4 py-1.5 bg-emerald-800 text-white font-bold rounded-xl cursor-pointer">
                  추가
                </button>
              </form>
              <div className="flex flex-wrap gap-2 pt-2">
                {holidays.map((h) => (
                  <span key={h.date} className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 rounded-lg text-xs text-stone-700">
                    {h.date} ({h.name})
                    <button
                      onClick={() => setHolidays(holidays.filter((item) => item.date !== h.date))}
                      className="text-stone-400 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* 객실 QR 포스터 인쇄 */
          <div className="text-center space-y-4">
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-sm print:hidden shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4 inline mr-1.5" /> A4 포스터 인쇄하기
            </button>
            <div className="bg-white p-10 max-w-md mx-auto border-2 border-emerald-950 rounded-3xl text-center shadow-sm print:border-2 print:shadow-none">
              <span className="px-3 py-1 bg-emerald-100 text-emerald-900 text-xs font-bold rounded-full">
                삼호대숲 철새마을 게스트하우스
              </span>
              <h2 className="text-2xl font-black mt-3 text-stone-900">평일 숙박 스탬프북</h2>
              <p className="text-emerald-800 font-bold text-sm mt-1 leading-snug">
                11. 1. ~ 4. 30. 평일 10회 숙박 시<br />
                <strong className="text-amber-700 text-base">평일 1박 무료 숙박권</strong> 증정!
              </p>
              <div className="my-6 p-4 bg-stone-50 rounded-2xl inline-block border">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                    window.location.origin
                  )}`}
                  alt="객실 QR코드"
                  className="w-48 h-48 mx-auto"
                />
                <p className="text-xs font-bold text-emerald-900 mt-2 flex items-center justify-center gap-1">
                  <Feather className="w-3.5 h-3.5" /> 카메라로 스캔하면 즉시 적립
                </p>
              </div>
              <div className="text-left text-xs text-stone-600 bg-stone-50 p-4 rounded-xl space-y-1.5 border border-stone-200">
                <p className="font-bold text-stone-800">이용 규정 안내</p>
                <p>• <strong>적립 가능 시간:</strong> 입실(15:00)부터 다음 날 퇴실(11:00)까지</p>
                <p>• <strong>적립 대상:</strong> 일~목요일 평일 입실객 (주말 및 공휴일 전날 제외)</p>
                <p>• 10회 적립 시 스탬프북 상단에 무료 숙박권이 자동 생성됩니다.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // [모드 B] 순수 손님용 모드 (객실 QR 접속 시 기본 화면)
  // ==========================================
  return (
    <div className="min-h-screen bg-[#f5f6f1] text-[#2d372e] p-4 flex flex-col justify-center items-center font-sans">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-lg border border-stone-200 overflow-hidden">
        {/* 헤더 */}
        <div className="bg-gradient-to-br from-emerald-800 to-teal-950 text-white p-6">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-700/60 px-3 py-1 rounded-full text-emerald-200 border border-emerald-600/40">
            <Trees className="w-3.5 h-3.5" /> 삼호대숲 철새마을 게스트하우스
          </span>
          <h2 className="text-xl font-black mt-2 leading-snug">
            삼호대숲에 머무는 동안,<br />
            철새 스탬프를 모아보세요
          </h2>
          <div className="mt-3 pt-3 border-t border-emerald-700/50 flex items-center justify-between text-xs text-emerald-200">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> 적립: 15:00 ~ 익일 11:00
            </span>
            <span>11. 1. ~ 4. 30. 평일 한정</span>
          </div>
        </div>

        <div className="p-6">
          {/* 상태 알림창 */}
          <div
            className={`mb-5 p-3.5 rounded-2xl text-xs font-medium flex items-start gap-2.5 ${
              stayValidation.canStamp
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-amber-50 text-amber-900 border border-amber-200'
            }`}
          >
            {stayValidation.canStamp ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-bold">{stayValidation.reason}</p>
              <p className="text-[11px] opacity-80 mt-0.5">
                {stayValidation.canStamp
                  ? '성함과 전화번호를 입력하면 이번 숙박 스탬프 1회가 즉시 적립됩니다.'
                  : '스탬프 적립 가능 시간이 아니므로 기존 내역 조회만 가능합니다.'}
              </p>
            </div>
          </div>

          {/* 알림 메시지 */}
          {message && (
            <div
              className={`mb-4 p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                message.type === 'error'
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : message.type === 'reward'
                  ? 'bg-amber-100 text-amber-950 border border-amber-300'
                  : message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                  : 'bg-stone-100 text-stone-700'
              }`}
            >
              {message.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* 입력 폼 */}
          {!myCustomerData ? (
            <form onSubmit={handleGuestSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">예약자 성함</label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="홍길동"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">휴대폰 번호</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    placeholder="010-1234-5678"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(formatPhone(e.target.value))}
                    className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-sm transition cursor-pointer shadow-md disabled:bg-stone-400"
              >
                {isSubmitting
                  ? '처리 중...'
                  : stayValidation.canStamp
                  ? '철새 스탬프 적립하기'
                  : '내 스탬프북 열람하기'}
              </button>
            </form>
          ) : (
            /* 스탬프북 본문 */
            <div className="space-y-5">
              <div className="flex justify-between items-center border-b pb-3">
                <div>
                  <span className="text-xs text-stone-400 font-mono">{myCustomerData.phone}</span>
                  <h3 className="font-bold text-stone-900 text-base">{myCustomerData.name}님의 철새 여정</h3>
                </div>
                <button
                  onClick={() => {
                    setMyCustomerId(null);
                    setMyCustomerData(null);
                    localStorage.removeItem('samho_guest_id');
                  }}
                  className="text-xs text-stone-500 hover:text-stone-800 flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" /> 번호 변경
                </button>
              </div>

              {/* 무료 숙박권 */}
              {myCustomerData.coupons > 0 && (
                <div className="bg-amber-50 border-2 border-dashed border-amber-400 rounded-2xl p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-400 text-white flex items-center justify-center shrink-0">
                    <Gift className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                      사용 가능: {myCustomerData.coupons}장
                    </span>
                    <h4 className="font-bold text-stone-900 text-sm mt-0.5">평일 1박 무료 숙박권</h4>
                    <p className="text-[11px] text-stone-600 font-mono">쿠폰코드: {myCustomerData.couponCode}</p>
                  </div>
                </div>
              )}

              {/* 10칸 스탬프 그리드 */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-stone-600">삼호대숲 둥지 스탬프</span>
                  <span className="text-sm font-black text-emerald-800">{myCustomerData.stamps || 0} / 10회</span>
                </div>
                <div className="grid grid-cols-5 gap-2 bg-stone-50 p-3.5 rounded-2xl border">
                  {Array.from({ length: 10 }).map((_, idx) => {
                    const isStamped = idx < (myCustomerData.stamps || 0);
                    return (
                      <div
                        key={idx}
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center border transition ${
                          isStamped
                            ? 'bg-emerald-800 border-emerald-800 text-white shadow-xs'
                            : 'bg-white border-dashed border-stone-300 text-stone-300'
                        }`}
                      >
                        <Feather className={`w-4 h-4 ${isStamped ? 'text-amber-300' : 'text-stone-300'}`} />
                        <span className="text-[9px] font-bold mt-0.5">{idx + 1}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 히스토리 */}
              {myCustomerData.history && myCustomerData.history.length > 0 && (
                <div className="text-xs text-stone-500 bg-stone-50 p-3 rounded-xl border">
                  <p className="font-semibold text-stone-700 mb-1">최근 입실 기록</p>
                  <div className="flex flex-wrap gap-1">
                    {myCustomerData.history.slice(-5).map((d, i) => (
                      <span key={i} className="px-2 py-0.5 bg-white border rounded text-[10px] font-mono">
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
    </div>
  );
}