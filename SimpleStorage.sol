// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimpleStorage {
    string public ipfsHash;

    function store(string memory _ipfsHash) public {
        ipfsHash = _ipfsHash;
    }
}
