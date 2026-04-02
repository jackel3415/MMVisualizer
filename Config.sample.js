let config = {
  address: "localhost",
  port: 8080,
  basePath: "/",
  language: "en",
  locale: "en-US",
  logLevel: ["INFO","LOG","WARN","ERROR"],
  timeFormat: 12,
  units: "imperial",

  modules: [
    {
      module: "alert",
    },
    {
      module: "updatenotification",
      position: "top_bar",
    },
    {
      module: "clock",
      position: "top_left",
      config: {
              displaySeconds: false,
              showDate: true,
              showWeek: false,
              dateFormat: "dddd, MMMM D"
            },
    },
    {
      module: "MMM-CalendarExt3",
      position: "middle_center",
      config: {
              mode: "week",
              firstDayOfWeek: 0,
              weekIndex: 0,
              weeksInView: 2,
              locale: "en-US",
              weekends: [0,6],
              useSymbol: true,
              calendarSet: [],
              calendars: [
                {
                  "url": "YOUR_ICAL_URL_HERE",
                  "name": "My Calendar",
                  "color": "#4A90D9",
                  "symbol": "calendar"
                }
              ]
            },
    },
    {
      module: "weather",
      position: "top_right",
      config: {
              weatherProvider: "openweathermap",
              type: "current",
              location: "New York,US",
              apiKey: "YOUR_OPENWEATHERMAP_API_KEY",
              units: "imperial",
              updateInterval: 600000,
              showWindDirection: true,
              showWindDirectionAsArrow: true,
              showHumidity: true,
              showFeelsLike: true
            },
    },
    {
      module: "weather",
      position: "top_right",
      header: "5-Day Forecast",
      config: {
              weatherProvider: "openweathermap",
              type: "forecast",
              location: "New York,US",
              apiKey: "YOUR_OPENWEATHERMAP_API_KEY",
              units: "imperial",
              updateInterval: 1800000,
              maximumEntries: 5,
              initialLoadDelay: 2000
            },
    }
  ],
};

/*************** DO NOT EDIT THE LINE BELOW ***************/
if (typeof module !== "undefined") { module.exports = config; }
