"use client"

import TextField from "@/app/components/Input/TextField"

const Page = () => {
    return (
        <>
            <main className="flex-1 overflow-y-auto p-4">
                <div className="flex  flex-col gap-4">
                    <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm flex gap-2 flex-col">
                        <div className="text-lg flex gap-4">
                            ATC Part no.<span className="text-gray-400">0000xxxxxxx</span>
                        </div>

                        <div className="flex flex-row gap-2 justify-between">
                            <div>Part name<span className="text-gray-400 ml-3">0000xxxxxxx</span></div>
                            <div>Material name<span className="text-gray-400 ml-3">0000xxxxxxx</span></div>
                            <div>Diameter<span className="text-gray-400 ml-3">0000xxxxxxx</span></div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm flex gap-2 flex-col ">
                        <div className="text-lg font-semibold mb-5">
                            SUPPLIER INFORMATION
                        </div>

                        <div>
                            <TextField label="Supplier Name" placeholder="Please fill in information...." />
                        </div>

                        <div>
                            <TextField label="Industrial Estate" placeholder="Please fill in information...." />
                        </div>

                        <div>
                            <TextField label="Country" placeholder="Please fill in information...." />
                        </div>

                        <div>
                            <TextField label="Province" placeholder="Please fill in information...." />
                        </div>

                        <div>
                            <TextField label="City" placeholder="Please fill in information...." />
                        </div>


                    </div>

                    <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm flex gap-2 flex-col ">
                        <div className="text-lg font-semibold mb-5">
                            PRODUCTION INFORMATION
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
                            <div>
                                <TextField label="Chain Process" placeholder="Please fill in information...." />
                            </div>

                            <div>
                                <TextField label="Material name" placeholder="Please fill in information...." />
                            </div>

                            <div>
                                <TextField label="Diameter" placeholder="Please fill in information...." />
                            </div>

                            <div>
                                <TextField label="Std. Stock (days)" placeholder="Please fill in information...." />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm flex gap-2 flex-col ">
                        <div className="text-lg font-semibold mb-5">
                            BACK UP CONDITION
                        </div>

                        <div className="flex gap-4">
                            <div className="w-1/2 border-r border-dashed border-gray-300 pr-4">
                                <div>
                                    <p className="">Dual Source</p>
                                    <TextField label="Supplier name" placeholder="Please fill in information...." />
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                                    <div>
                                        <TextField label="Country" placeholder="Please fill in information...." />
                                    </div>

                                    <div>
                                        <TextField label="Province" placeholder="Please fill in information...." />
                                    </div>

                                    <div>
                                        <TextField label="City" placeholder="Please fill in information...." />
                                    </div>
                                </div>
                            </div>

                            <div className="w-1/2 pl-4">
                                <p className="">PD Replacement</p>
                                <TextField label="Supplier name" placeholder="Please fill in information...." />

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
                                    <div>
                                        <TextField label="Country" placeholder="Please fill in information...." />
                                    </div>

                                    <div>
                                        <TextField label="Province" placeholder="Please fill in information...." />
                                    </div>

                                    <div>
                                        <TextField label="City" placeholder="Please fill in information...." />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </main>
        </>
    )
}

export default Page