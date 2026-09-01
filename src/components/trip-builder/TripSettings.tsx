import React, { useState, useEffect, useMemo } from "react";
import {
  Clock,
  Building2,
  Plane,
  Plus,
  Minus,
  PlaneTakeoff,
  PlaneLanding,
  Timer,
  Car,
  Footprints,
  Train,
} from "lucide-react";
import { PlaceSearchInput } from "./PlaceSearchInput";
import { useRouteStore } from "../../store/useRouteStore";
import { TravelMode } from "../../types";
import { MOCK_HOTELS } from "../../services/mockData";
import { HotelSearchInput } from "./HotelSearchInput";

import { DatePicker } from "../ui/DatePicker";
import { format, addDays } from "date-fns";

const deriveStaysFromHotels = (hotels: any[], totalDays: number, stayBoundaries: number[]) => {
  if (totalDays === 0) return [];
  const stays: { startDay: number; endDay: number; hotel: any; id: string }[] = [];
  
  let currentStart = 0;
  let currentHotel = hotels.find((h) => h.dayIndex === 0) || null;

  for (let i = 1; i < totalDays; i++) {
    const dayHotel = hotels.find((h) => h.dayIndex === i) || null;
    
    const isSame =
      !stayBoundaries.includes(i - 1) &&
      ((!currentHotel && !dayHotel) ||
      (currentHotel &&
        dayHotel &&
        currentHotel.name === dayHotel.name &&
        currentHotel.lat === dayHotel.lat &&
        currentHotel.lng === dayHotel.lng));

    if (!isSame) {
      stays.push({
        id: `stay-${currentStart}-${i - 1}-${currentHotel?.name || "null"}`,
        startDay: currentStart,
        endDay: i - 1,
        hotel: currentHotel,
      });
      currentStart = i;
      currentHotel = dayHotel;
    }
  }

  stays.push({
    id: `stay-${currentStart}-${totalDays - 1}-${currentHotel?.name || "null"}`,
    startDay: currentStart,
    endDay: totalDays - 1,
    hotel: currentHotel,
  });

  return stays;
};

export const TripSettings: React.FC = React.memo(() => {
  const {
    days,
    setDays,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    dateMode,
    setDateMode,
    dayStartTime,
    dayEndTime,
    setDayTimes,
    showFlights,
    setShowFlights,
    arrivalFlight,
    setArrivalFlight,
    departureFlight,
    setDepartureFlight,
    travelMode,
    setTravelMode,
    strictBudget,
    setStrictBudget,
    hotels,
    setHotelRange,
    appMode,
  } = useRouteStore();

  const [daysInput, setDaysInput] = useState(days.toString());
  const [openPicker, setOpenPicker] = useState<"start" | "end" | null>(null);
  const [stayBoundaries, setStayBoundaries] = useState<number[]>([]);

  // Sync internal input state with store days
  useEffect(() => {
    setDaysInput(days.toString());
  }, [days]);


  const handleDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDaysInput(e.target.value);
  };

  const handleDaysBlur = () => {
    const val = parseInt(daysInput);
    if (!isNaN(val) && val >= 1 && val <= 999) {
      setDays(val);
    } else {
      setDaysInput(days.toString());
    }
  };

  const handleArrivalChange = (
    updates: Partial<{ time: string; buffer: number; location: any }>,
  ) => {
    const current = arrivalFlight || {
      time: "12:00",
      buffer: 60,
      location: null,
    };
    setArrivalFlight({ ...current, ...updates });
  };

  const handleDepartureChange = (
    updates: Partial<{ time: string; buffer: number; location: any }>,
  ) => {
    const current = departureFlight || {
      time: "12:00",
      buffer: 60,
      location: null,
    };
    setDepartureFlight({ ...current, ...updates });
  };

  const handleHotelRangeChange = (startDay: number, endDay: number, hotelData: any) => {
    let hotel = null;

    if (hotelData) {
      if (appMode !== "real") {
        const mockHotel =
          typeof hotelData === "string"
            ? MOCK_HOTELS[parseInt(hotelData)]
            : hotelData;
        if (mockHotel) {
          hotel = { ...mockHotel };
        }
      } else {
        hotel = {
          name: hotelData.name,
          address: hotelData.address,
          lat: hotelData.lat,
          lng: hotelData.lng,
        };
      }
    }

    setHotelRange(startDay, endDay, hotel);
  };

  const stays = useMemo(
    () => deriveStaysFromHotels(hotels, days, stayBoundaries),
    [hotels, days, stayBoundaries],
  );

  return (
    <div className="space-y-6 transition-colors">
      {/* Travel Mode */}
      <div>
        <h3 className="text-sm font-semibold text-surface-900 dark:text-white uppercase tracking-wider mb-3">
          Global Travel Mode
        </h3>
        <div className="flex flex-wrap bg-surface-100 dark:bg-surface-900/50 p-1 rounded-lg gap-1">
          {(["walking", "transit", "driving"] as TravelMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setTravelMode(mode)}
              className={`flex-1 min-w-[80px] flex items-center justify-center gap-1 sm:gap-2 py-2 px-2 rounded-md text-xs sm:text-sm font-medium capitalize transition-all ${
                travelMode === mode
                  ? "bg-white dark:bg-surface-700 text-primary-600 dark:text-primary-400 shadow-sm"
                  : "text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-200"
              }`}
            >
              {mode === "walking" && (
                <Footprints className="w-4 h-4 shrink-0" />
              )}
              {mode === "transit" && <Train className="w-4 h-4 shrink-0" />}
              {mode === "driving" && <Car className="w-4 h-4 shrink-0" />}
              <span className="truncate">{mode}</span>
            </button>
          ))}
        </div>
      </div>

      <hr className="border-surface-100 dark:border-surface-700" />

      {/* Date Options */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-surface-900 dark:text-white uppercase tracking-wider">
            Dates & Duration
          </h3>
          <div className="flex bg-surface-100 dark:bg-surface-900/50 p-0.5 rounded-md">
            <button
              onClick={() => setDateMode("duration")}
              className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-all ${dateMode === "duration" ? "bg-white dark:bg-surface-700 text-primary-600 shadow-sm" : "text-surface-500 hover:text-surface-700"}`}
            >
              Duration
            </button>
            <button
              onClick={() => setDateMode("fixed")}
              className={`px-2 py-1 text-[10px] font-bold uppercase rounded transition-all ${dateMode === "fixed" ? "bg-white dark:bg-surface-700 text-primary-600 shadow-sm" : "text-surface-500 hover:text-surface-700"}`}
            >
              Exact Dates
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {dateMode === "duration" ? (
            <div>
              <label className="block text-xs font-bold text-surface-500 uppercase mb-2">
                Trip Duration
              </label>
              <div
                className="flex items-center justify-between text-sm text-surface-900 dark:text-white bg-white dark:bg-surface-800 px-3 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 shadow-sm focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500 transition-all cursor-pointer group"
                onClick={(e) => {
                  const input = e.currentTarget.querySelector("input");
                  if (input) input.focus();
                }}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={daysInput}
                    onChange={handleDaysChange}
                    onBlur={handleDaysBlur}
                    className="w-12 bg-transparent font-bold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-surface-500 font-bold uppercase text-[10px] tracking-widest border-l border-surface-100 dark:border-surface-700 pl-3">
                    Total Days
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDays(Math.max(1, days - 1));
                      setDaysInput(String(Math.max(1, days - 1)));
                    }}
                    className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 hover:text-primary-600 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDays(days + 1);
                      setDaysInput(String(days + 1));
                    }}
                    className="p-1 rounded hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 hover:text-primary-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(val) => {
                  setStartDate(val);
                  // Auto-switch to end date picker
                  setOpenPicker("end");
                }}
                isOpen={openPicker === "start"}
                onOpenChange={(open) => setOpenPicker(open ? "start" : null)}
              />
              <DatePicker
                label="End Date"
                value={endDate}
                min={startDate}
                onChange={(val) => {
                  setEndDate(val);
                  setOpenPicker(null);
                }}
                isOpen={openPicker === "end"}
                onOpenChange={(open) => setOpenPicker(open ? "end" : null)}
                highlight={openPicker === "end"}
              />
            </div>
            <p className="mt-2 text-[10px] font-bold text-surface-400 uppercase text-right">
              Total: <span className="text-primary-600">{days} days</span>
            </p>
            </>
          )}
        </div>
      </div>

      <hr className="border-surface-100 dark:border-surface-700" />

      {/* Daily Routine */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-surface-900 dark:text-white uppercase tracking-wider">
            Daily Routine
          </h3>
          <p className="text-[10px] text-surface-400 font-medium italic">
            Local time
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="time"
              value={dayStartTime}
              onChange={(e) => setDayTimes(e.target.value, dayEndTime)}
              className="w-full bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white text-sm rounded-lg pl-10 p-2.5 outline-none"
            />
          </div>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="time"
              value={dayEndTime}
              onChange={(e) => setDayTimes(dayStartTime, e.target.value)}
              className="w-full bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white text-sm rounded-lg pl-10 p-2.5 outline-none"
            />
          </div>
        </div>

        {/* Strict Budget Toggle */}
        <div className="mt-4 flex flex-col gap-1.5 p-3 bg-surface-100 dark:bg-surface-800/50 rounded-xl border border-surface-200 dark:border-surface-700/50">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-surface-900 dark:text-white flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-primary-500" />
              Enforce Time Budget
            </h4>
            <button
              onClick={() => setStrictBudget(!strictBudget)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${strictBudget ? "bg-primary-500" : "bg-surface-300 dark:bg-surface-600"}`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform`}
                style={{ transform: strictBudget ? "translateX(18px)" : "translateX(4px)" }}
              />
            </button>
          </div>
          <p className="text-[10px] text-surface-500 dark:text-surface-400 pr-8">
            If ON, the auto-scheduler will leave places Unassigned if they exceed your daily hours. If OFF, it will fit everything in.
          </p>
        </div>
      </div>

      <hr className="border-surface-100 dark:border-surface-700" />

      {/* Flight & Travel Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-surface-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Plane className="w-4 h-4" />
            Flight & Travel
          </h3>
          <button
            onClick={() => setShowFlights(!showFlights)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none ring-2 ring-offset-2 ring-offset-white dark:ring-offset-surface-800 ring-transparent focus:ring-primary-500/50 ${showFlights ? "bg-primary-500 shadow-[0_0_12px_rgba(var(--primary-500-rgb),0.4)]" : "bg-surface-300 dark:bg-surface-600"}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-300 ${showFlights ? "translate-x-6" : "translate-x-1"}`}
            />
          </button>
        </div>

        {showFlights && (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="bg-primary-50/50 dark:bg-primary-900/10 rounded-2xl p-4 border border-primary-100/50 dark:border-primary-900/20">
              <h4 className="text-xs font-bold text-primary-700 dark:text-primary-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <PlaneTakeoff className="w-3.5 h-3.5" />
                Arrival Journey (Day 1)
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-surface-400 uppercase mb-1.5 ml-1">
                    Arrival Airport/Station{" "}
                    <span className="text-[9px] lowercase font-medium opacity-60">
                      (optional)
                    </span>
                  </label>
                  <PlaceSearchInput
                    icon="airport"
                    placeholder="Search for airport or station..."
                    currentValue={arrivalFlight?.location?.name}
                    onSelect={(loc) => handleArrivalChange({ location: loc })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-surface-400 uppercase mb-1.5 ml-1">
                      Land Time
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                      <input
                        type="time"
                        value={arrivalFlight?.time || "12:00"}
                        onChange={(e) =>
                          handleArrivalChange({ time: e.target.value })
                        }
                        className="w-full bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-surface-400 uppercase mb-1.5 ml-1">
                      Buffer (Min)
                    </label>
                    <div className="relative">
                      <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                      <input
                        type="number"
                        value={arrivalFlight?.buffer || 60}
                        onChange={(e) =>
                          handleArrivalChange({
                            buffer: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-red-50/50 dark:bg-red-900/10 rounded-2xl p-4 border border-red-100/50 dark:border-red-900/20">
              <h4 className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <PlaneLanding className="w-3.5 h-3.5" />
                Departure Journey (Day {days})
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-surface-400 uppercase mb-1.5 ml-1">
                    Departure Airport/Station{" "}
                    <span className="text-[9px] lowercase font-medium opacity-60">
                      (optional)
                    </span>
                  </label>
                  <PlaceSearchInput
                    icon="airport"
                    placeholder="Search for airport or station..."
                    currentValue={departureFlight?.location?.name}
                    onSelect={(loc) => handleDepartureChange({ location: loc })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-surface-400 uppercase mb-1.5 ml-1">
                      Takeoff Time
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                      <input
                        type="time"
                        value={departureFlight?.time || "12:00"}
                        onChange={(e) =>
                          handleDepartureChange({ time: e.target.value })
                        }
                        className="w-full bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-surface-400 uppercase mb-1.5 ml-1">
                      Buffer (Min)
                    </label>
                    <div className="relative">
                      <Timer className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                      <input
                        type="number"
                        value={departureFlight?.buffer || 60}
                        onChange={(e) =>
                          handleDepartureChange({
                            buffer: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl py-2.5 pl-10 pr-4 text-sm font-bold text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <hr className="border-surface-100 dark:border-surface-700" />

      {/* Lodging */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-surface-900 dark:text-white uppercase tracking-wider">
            Stay & Lodging
          </h3>
        </div>

        <div className="space-y-4">
          {stays.map((stay, idx) => (
            <div key={stay.id} className="relative flex flex-col gap-2 bg-surface-50 dark:bg-surface-800/50 p-3 rounded-xl border border-surface-200 dark:border-surface-700">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-surface-500 uppercase tracking-widest">Stay {idx + 1}</span>
                {idx > 0 && (
                  <button 
                    onClick={() => {
                      setHotelRange(stay.startDay, stay.endDay, stays[idx-1].hotel);
                      setStayBoundaries(b => b.filter(x => x !== stay.startDay - 1));
                    }}
                    className="text-[10px] text-primary-600 hover:text-primary-700 font-bold uppercase transition-colors"
                  >
                    Merge with previous
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-surface-900 dark:text-white">
                  {dateMode === "fixed" && startDate
                    ? format(
                        addDays(new Date(startDate + "T12:00:00"), stay.startDay),
                        "MMM d",
                      )
                    : `Day ${stay.startDay + 1}`}
                </span>
                <span className="text-xs text-surface-400">to</span>
                <select
                  value={stay.endDay}
                  onChange={(e) => {
                    const newEndDay = parseInt(e.target.value);
                    if (newEndDay > stay.endDay) {
                      setHotelRange(stay.startDay, newEndDay, stay.hotel);
                      setStayBoundaries((b) => [
                        ...b.filter((x) => x < stay.startDay || x >= newEndDay),
                        newEndDay,
                      ]);
                    } else if (newEndDay < stay.endDay) {
                      setHotelRange(newEndDay + 1, stay.endDay, null);
                      setStayBoundaries((b) => [...b, newEndDay]);
                    }
                  }}
                  className="bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white text-xs font-bold rounded-lg focus:ring-primary-500 focus:border-primary-500 py-1 pl-2 pr-6 appearance-none cursor-pointer"
                >
                  {Array.from({ length: days - stay.startDay }).map((_, i) => {
                    const val = stay.startDay + i;
                    return (
                      <option key={val} value={val}>
                        {dateMode === "fixed" && startDate
                          ? format(
                              addDays(new Date(startDate + "T12:00:00"), val),
                              "MMM d",
                            )
                          : `Day ${val + 1}`}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="relative flex items-center">
                {appMode === "dropdown-mock" ? (
                  <>
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400 dark:text-surface-500" />
                    <select
                      value={stay.hotel ? MOCK_HOTELS.findIndex(h => h.name === stay.hotel.name) : ""}
                      onChange={(e) => handleHotelRangeChange(stay.startDay, stay.endDay, e.target.value)}
                      className="w-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block pl-10 p-2.5 appearance-none cursor-pointer"
                    >
                      <option value="" disabled>Select hotel...</option>
                      {MOCK_HOTELS.map((h, i) => <option key={i} value={i}>{h.name}</option>)}
                    </select>
                  </>
                ) : (
                  <HotelSearchInput
                    onSelect={(h) => handleHotelRangeChange(stay.startDay, stay.endDay, h)}
                    placeholder={`Search hotel for Days ${stay.startDay + 1}-${stay.endDay + 1}...`}
                    currentValue={stay.hotel?.name || ""}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

