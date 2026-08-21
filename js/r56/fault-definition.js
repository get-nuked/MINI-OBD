export const R56_MODULES = [
    { id: "EPS", name: "Electric Power Steering", sgbd: "eps_56.prg", address: 0x30 },
    { id: "CAS", name: "Car Access System", sgbd: "cas.prg", address: 0x40 },
    { id: "DME", name: "Engine ECU", sgbd: "mev17_2n.prg", address: 0x12 },
    { id: "DSC", name: "Dynamic Stability Control", sgbd: "dsc_56.prg", address: 0x29 },
    { id: "FRM", name: "Footwell Module", sgbd: "frm_70.prg", address: 0x72 },
    { id: "IHKS", name: "Heating / Air Conditioning", sgbd: "ihks56.prg", address: 0x78 },
    { id: "KOMBI", name: "Instrument Cluster", sgbd: "komb56.prg", address: 0x60 },
    { id: "RAD2", name: "Radio", sgbd: "rad2.prg", address: 0x63 },
    { id: "RAD2_GW", name: "Radio Gateway", sgbd: "rad2_gw.prg", address: 0x62 },
    { id: "ACSM", name: "Crash Safety / Airbag", sgbd: "acsm60.prg", address: 0x01 },
    { id: "SZL", name: "Steering Column Switch Cluster", sgbd: "szl_56.prg", address: 0x02 },
    { id: "SPEG", name: "Power Electronics / Body Module", sgbd: "speg56.prg", address: 0x00 }
]

export const READ_FAULT_MEMORY_REQUEST = [0x18, 0x02, 0xFF, 0xFF]
export const READ_FAULT_DETAIL_SERVICE = 0x17
