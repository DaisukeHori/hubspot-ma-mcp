"use client";

import { useState, useEffect } from "react";

const MCP_URL = "https://hubspot-ma-mcp.vercel.app/api/mcp";
const TOKEN_PLACEHOLDER = "pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx";

function Sprocket({ size = 32, color = "#FF7A59" }: { size?: number; color?: string }) {
  return (
    &lt;svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg"&gt;
      &lt;path d="M50 10C27.9 10 10 27.9 10 50s17.9 40 40 40 40-17.9 40-40S72.1 10 50 10zm0 60c-11 0-20-9-20-20s9-20 20-20 20 9 20 20-9 20-20 20z" fill={color} /&gt;
      &lt;circle cx="50" cy="12" r="8" fill={color} /&gt;
      &lt;circle cx="83" cy="31" r="8" fill={color} /&gt;
      &lt;circle cx="83" cy="69" r="8" fill={color} /&gt;
      &lt;circle cx="50" cy="88" r="8" fill={color} /&gt;
      &lt;circle cx="17" cy="69" r="8" fill={color} /&gt;
      &lt;circle cx="17" cy="31" r="8" fill={color} /&gt;
    &lt;/svg&gt;
  );
}
