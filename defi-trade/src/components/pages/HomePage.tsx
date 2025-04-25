import ChartContainer from "../chart/ChartContainer";
import Trade from "../Trade";
import TradingStats from "../chart/TradingStats";
import DonutVolumeChart from "../chart/DonutChart";
import InflowOutChart from "../chart/InflowOutChart";
import OrderBook from "../OrderBook";
import SuiHistory from "./HistoricData";
import SuiPredictor from "../AIModel";
import PredictionDisplay from "./HistoricData";
import Strategies from "../Strategies";
import StrategyForm from "../Strategies";
import LiquidationTable from "../AllUserStrategy";

const HomePage = () => {
  return (
    <div className="h-full bg-black">
      {/* <PredictionDisplay /> */}
      {/* <SuiHistory /> */}

      {/* <StrategyForm /> */}
      <div className="flex justify-between py-5 px-5">
        <div className="h-[600px] w-[850px] ">
          <div className=" text-2xl font-bold text-white">SUI/USDC</div>
          <ChartContainer />
          <div className="py-10">
            <StrategyForm />
            {/* <Trade /> */}
          </div>
          {/* <SuiHistory /> */}
        </div>
        <div className="pt-10">
          <TradingStats />
          <div className="text-2xl font-bold max-w-100px h-full pt-10">
            <OrderBook />
          </div>
        </div>
      </div>
      <div className="text-white mt-[300px]">
        <LiquidationTable />
      </div>
      <div>
        <SuiHistory />
      </div>
      <div className="flex  px-20 py-10 gap-5 h-full ">
        <InflowOutChart />
        <DonutVolumeChart />
      </div>
    </div>
  );
};

export default HomePage;
