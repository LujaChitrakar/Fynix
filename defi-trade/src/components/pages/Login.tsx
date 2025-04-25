// import { useLogin } from "../../context/UserContext";
// import TransferSUI from "../../components/TransferSUI";

// function Login() {
//   const { isLoggedIn, userDetails, login, logOut } = useLogin();

//   return (
//     <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-screen flex justify-center items-center">
//       <div className="bg-white p-8 rounded-lg shadow-lg w-full sm:w-96">
//         <h3 className="text-2xl font-semibold text-center text-gray-800 mb-6">
//           ZKLogin + Enoki
//         </h3>

//         <div className="mb-4">
//           <div className="text-gray-600">Address: {userDetails.address}</div>
//           <div className="text-gray-600">Provider: {userDetails.provider}</div>
//         </div>

//         <div className="flex justify-center mb-6">
//           {!isLoggedIn ? (
//             <button
//               onClick={login}
//               className="bg-blue-600 text-white py-2 px-6 rounded-lg shadow-md hover:bg-blue-700 transition-all duration-200"
//             >
//               Sign in with Google
//             </button>
//           ) : (
//             <button
//               onClick={logOut}
//               className="bg-red-600 text-white py-2 px-6 rounded-lg shadow-md hover:bg-red-700 transition-all duration-200"
//             >
//               Sign Out
//             </button>
//           )}
//         </div>

//         <div className="mt-6">
//           <TransferSUI />
//         </div>
//       </div>
//     </div>
//   );
// }

// export default Login;
